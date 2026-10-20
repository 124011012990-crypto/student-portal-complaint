<?php

namespace App\Services;

use App\Config\Config;
use App\Config\Database;
use App\Helpers\Session;
use App\Helpers\Security;
use App\Middleware\RateLimitMiddleware;
use PDO;
use RuntimeException;

class AuthService
{
    /**
     * Unified Login supporting Email, Username, or Student Roll Number
     * Prevents account enumeration via generic error responses
     */
    public static function login(string $identifier, string $password, bool $rememberMe = false): array
    {
        RateLimitMiddleware::check('login');

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            SELECT u.*, r.name as role_name, r.slug as role_slug, d.name as department_name, d.code as department_code
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.email = ? OR u.username = ? OR u.roll_number = ?
            LIMIT 1
        ");
        $stmt->execute([$identifier, $identifier, $identifier]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        // Prevent account enumeration: generic error message
        if (!$user) {
            RateLimitMiddleware::hit('login');
            AuditService::log(null, 'LOGIN_FAILED', 'user', null, "Failed login attempt for identifier '{$identifier}'");
            throw new RuntimeException("Invalid credentials. Please verify your identifier and password.");
        }

        // Check account lock
        if ($user['lock_until'] && strtotime($user['lock_until']) > time()) {
            $lockRemaining = ceil((strtotime($user['lock_until']) - time()) / 60);
            throw new RuntimeException("Account is temporarily locked due to consecutive failed attempts. Please retry in {$lockRemaining} minutes.");
        }

        // Check active status
        if ((int)$user['is_active'] !== 1) {
            throw new RuntimeException("Your account is deactivated or pending verification. Please contact the administrator.");
        }

        // Verify password
        if (!password_verify($password, $user['password_hash'])) {
            RateLimitMiddleware::hit('login');

            $failed = (int)$user['failed_logins'] + 1;
            $lockTime = null;
            if ($failed >= 5) {
                $lockTime = date('Y-m-d H:i:s', strtotime('+15 minutes'));
            }

            $updateStmt = $pdo->prepare("UPDATE users SET failed_logins = ?, lock_until = ? WHERE id = ?");
            $updateStmt->execute([$failed, $lockTime, $user['id']]);

            AuditService::log($user['id'], 'LOGIN_FAILED', 'user', $user['id'], "Failed password attempt #{$failed}");
            throw new RuntimeException("Invalid credentials. Please verify your identifier and password.");
        }

        // Successful authentication - reset lockout counter
        $resetStmt = $pdo->prepare("UPDATE users SET failed_logins = 0, lock_until = NULL WHERE id = ?");
        $resetStmt->execute([$user['id']]);
        RateLimitMiddleware::clear('login');

        // Fetch authoritative role permissions
        $permStmt = $pdo->prepare("
            SELECT p.slug
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = ?
        ");
        $permStmt->execute([$user['role_id']]);
        $permissions = $permStmt->fetchAll(PDO::FETCH_COLUMN);

        unset($user['password_hash']);
        $user['permissions'] = $permissions;

        // Establish session
        Session::setUser($user);
        Session::set('permissions', $permissions);

        // Generate CSRF token for the session
        $csrfToken = Security::generateCsrfToken();
        $user['csrf_token'] = $csrfToken;

        // Secure Persistent Remember-Me
        if ($rememberMe) {
            self::createRememberToken((int)$user['id']);
        }

        AuditService::log($user['id'], 'LOGIN_SUCCESS', 'user', $user['id'], "Successful login from IP " . Security::getClientIp());

        return $user;
    }

    /**
     * Terminate user session and revoke remember-me persistent tokens
     */
    public static function logout(): void
    {
        $userId = Session::getUserId();
        if ($userId) {
            AuditService::log($userId, 'LOGOUT', 'user', $userId, "User logged out");
        }
        self::clearRememberMe();
        Session::destroy();
    }

    /**
     * Retrieve active authenticated user with DB freshness check and remember-me fallback
     */
    public static function getCurrentUser(): ?array
    {
        $user = Session::getUser();

        // If session empty, attempt persistent remember-me token restore
        if (!$user) {
            $user = self::checkRememberMe();
            if (!$user) {
                return null;
            }
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            SELECT u.id, u.username, u.email, u.full_name, u.phone, u.role_id, u.department_id, u.roll_number, u.is_active,
                   r.name as role_name, r.slug as role_slug, d.name as department_name, d.code as department_code
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.id = ?
        ");
        $stmt->execute([$user['id']]);
        $fresh = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$fresh || (int)$fresh['is_active'] !== 1) {
            self::clearRememberMe();
            Session::destroy();
            return null;
        }

        $permStmt = $pdo->prepare("
            SELECT p.slug
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = ?
        ");
        $permStmt->execute([$fresh['role_id']]);
        $fresh['permissions'] = $permStmt->fetchAll(PDO::FETCH_COLUMN);
        $fresh['csrf_token'] = Security::generateCsrfToken();

        Session::setUser($fresh);
        Session::set('permissions', $fresh['permissions']);
        return $fresh;
    }

    /**
     * Student Account Activation: Step 1 - Check College Student Registry & Dispatch OTP
     */
    public static function initiateStudentActivation(string $rollNumber, string $email): array
    {
        RateLimitMiddleware::check('activate', 5, 300);

        $pdo = Database::getConnection();
        $rollNumber = trim($rollNumber);
        $email = strtolower(trim($email));

        $stmt = $pdo->prepare("
            SELECT sr.*, d.name as department_name
            FROM student_registry sr
            LEFT JOIN departments d ON sr.department_id = d.id
            WHERE sr.roll_number = ? AND LOWER(sr.email) = ?
            LIMIT 1
        ");
        $stmt->execute([$rollNumber, $email]);
        $registry = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$registry) {
            RateLimitMiddleware::hit('activate');
            AuditService::log(null, 'ACTIVATION_FAILED', 'student_registry', null, "Registry mismatch for Roll: '{$rollNumber}', Email: '{$email}'");
            throw new RuntimeException("Student ID and registered college email combination was not found in the official institutional registry. Please contact the administrative desk.");
        }

        if ((int)$registry['is_activated'] === 1) {
            throw new RuntimeException("This student account has already been claimed and activated. Please log in with your credentials or use Forgot Password.");
        }

        // Generate 6-digit OTP and secure session authorization token
        $otpCode = sprintf('%06d', random_int(100000, 999999));
        $sessionToken = bin2hex(random_bytes(24));
        $otpHash = password_hash($otpCode, PASSWORD_BCRYPT);
        $tokenHash = hash('sha256', $sessionToken);
        $expiresAt = date('Y-m-d H:i:s', time() + 900); // 15 minutes

        $upStmt = $pdo->prepare("
            UPDATE student_registry
            SET otp_code_hash = ?, activation_token_hash = ?, otp_expires_at = ?
            WHERE id = ?
        ");
        $upStmt->execute([$otpHash, $tokenHash, $expiresAt, $registry['id']]);

        AuditService::log(null, 'ACTIVATION_INITIATED', 'student_registry', $registry['id'], "OTP generated for student {$rollNumber}");

        $response = [
            'roll_number'     => $registry['roll_number'],
            'email'           => $registry['email'],
            'full_name'       => $registry['full_name'],
            'department_name' => $registry['department_name'] ?? 'College Academic Unit',
            'session_token'   => $sessionToken,
            'expires_in'      => 900,
            'message'         => "Verification code has been dispatched to your institutional email: {$registry['email']}."
        ];

        // For local development & testing where SMTP is not configured, provide OTP in debug payload
        if (Config::isDebug() || php_sapi_name() === 'cli') {
            $response['otp_debug_code'] = $otpCode;
        }

        return $response;
    }

    /**
     * Student Account Activation: Step 2 - Verify OTP Code
     */
    public static function verifyActivationOtp(string $rollNumber, string $email, string $otp, string $sessionToken): array
    {
        RateLimitMiddleware::check('activate_otp', 5, 300);

        $pdo = Database::getConnection();
        $rollNumber = trim($rollNumber);
        $email = strtolower(trim($email));

        $stmt = $pdo->prepare("SELECT * FROM student_registry WHERE roll_number = ? AND LOWER(email) = ? LIMIT 1");
        $stmt->execute([$rollNumber, $email]);
        $registry = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$registry || (int)$registry['is_activated'] === 1) {
            throw new RuntimeException("Invalid activation request.");
        }

        if (empty($registry['otp_expires_at']) || strtotime($registry['otp_expires_at']) < time()) {
            throw new RuntimeException("The verification code has expired. Please request a new code.");
        }

        if (!hash_equals($registry['activation_token_hash'] ?? '', hash('sha256', $sessionToken))) {
            throw new RuntimeException("Invalid activation session. Please restart account activation.");
        }

        if (!password_verify(trim($otp), $registry['otp_code_hash'])) {
            RateLimitMiddleware::hit('activate_otp');
            throw new RuntimeException("Invalid 6-digit verification code. Please check your email and retry.");
        }

        RateLimitMiddleware::clear('activate_otp');

        // Generate password creation grant token
        $passwordGrantToken = bin2hex(random_bytes(24));
        $grantHash = hash('sha256', $passwordGrantToken);

        $upStmt = $pdo->prepare("UPDATE student_registry SET activation_token_hash = ? WHERE id = ?");
        $upStmt->execute([$grantHash, $registry['id']]);

        return [
            'verified'             => true,
            'password_grant_token' => $passwordGrantToken,
            'message'              => "Verification successful. You may now create your secure password."
        ];
    }

    /**
     * Student Account Activation: Step 3 - Set Password and Provision Active Account
     */
    public static function completeStudentActivation(string $rollNumber, string $email, string $passwordGrantToken, string $password, ?string $phone = null): array
    {
        $pdo = Database::getConnection();
        $rollNumber = trim($rollNumber);
        $email = strtolower(trim($email));

        if (strlen($password) < 8) {
            throw new RuntimeException("Password must contain at least 8 characters.");
        }

        $stmt = $pdo->prepare("SELECT * FROM student_registry WHERE roll_number = ? AND LOWER(email) = ? AND is_activated = 0 LIMIT 1");
        $stmt->execute([$rollNumber, $email]);
        $registry = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$registry) {
            throw new RuntimeException("Registry record not found or already activated.");
        }

        if (!hash_equals($registry['activation_token_hash'] ?? '', hash('sha256', $passwordGrantToken))) {
            throw new RuntimeException("Unauthorized activation request. Invalid security token.");
        }

        // Fetch Student role ID
        $roleStmt = $pdo->query("SELECT id FROM roles WHERE slug = 'student' LIMIT 1");
        $studentRoleId = (int)$roleStmt->fetchColumn();

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $phone = $phone ? trim($phone) : $registry['phone'];

        $pdo->beginTransaction();
        try {
            // Check if user already exists
            $userCheck = $pdo->prepare("SELECT id FROM users WHERE email = ? OR roll_number = ?");
            $userCheck->execute([$email, $rollNumber]);
            $existingUserId = $userCheck->fetchColumn();

            if ($existingUserId) {
                $userUpdate = $pdo->prepare("
                    UPDATE users
                    SET password_hash = ?, is_active = 1, failed_logins = 0, lock_until = NULL, phone = ?, updated_at = NOW()
                    WHERE id = ?
                ");
                $userUpdate->execute([$hash, $phone, $existingUserId]);
                $userId = (int)$existingUserId;
            } else {
                $userInsert = $pdo->prepare("
                    INSERT INTO users (username, email, password_hash, full_name, phone, role_id, department_id, roll_number, is_active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
                ");
                $userInsert->execute([
                    $rollNumber,
                    $email,
                    $hash,
                    $registry['full_name'],
                    $phone,
                    $studentRoleId,
                    $registry['department_id'],
                    $rollNumber
                ]);
                $userId = (int)$pdo->lastInsertId();
            }

            // Mark registry activated
            $regUpdate = $pdo->prepare("
                UPDATE student_registry
                SET is_activated = 1, activated_at = NOW(), otp_code_hash = NULL, activation_token_hash = NULL
                WHERE id = ?
            ");
            $regUpdate->execute([$registry['id']]);

            AuditService::log($userId, 'STUDENT_ACTIVATION_COMPLETE', 'user', $userId, "Student account activated: {$rollNumber} ({$registry['full_name']})");

            $pdo->commit();

            return [
                'success'     => true,
                'user_id'     => $userId,
                'roll_number' => $rollNumber,
                'email'       => $email,
                'message'     => "Your student account has been successfully activated. You may now sign in."
            ];
        } catch (\Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Forgot Password: Request OTP / Reset Token
     * Applies generic response to prevent user enumeration
     */
    public static function requestPasswordReset(string $identifierOrEmail): array
    {
        RateLimitMiddleware::check('forgot_pwd', 4, 600);

        $pdo = Database::getConnection();
        $identifier = trim($identifierOrEmail);

        $stmt = $pdo->prepare("
            SELECT id, email, username, full_name, is_active
            FROM users
            WHERE email = ? OR username = ? OR roll_number = ?
            LIMIT 1
        ");
        $stmt->execute([$identifier, $identifier, $identifier]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        $otpCode = null;
        if ($user && (int)$user['is_active'] === 1) {
            $otpCode = sprintf('%06d', random_int(100000, 999999));
            $token = bin2hex(random_bytes(24));
            $otpHash = password_hash($otpCode, PASSWORD_BCRYPT);
            $tokenHash = hash('sha256', $token);
            $expiresAt = date('Y-m-d H:i:s', time() + 900); // 15 mins

            $insStmt = $pdo->prepare("
                INSERT INTO password_resets (email, token_hash, otp_code_hash, expires_at, created_at)
                VALUES (?, ?, ?, ?, NOW())
            ");
            $insStmt->execute([$user['email'], $tokenHash, $otpHash, $expiresAt]);

            AuditService::log($user['id'], 'PASSWORD_RESET_REQUESTED', 'user', $user['id'], "Password reset OTP generated for {$user['email']}");
        }

        $res = [
            'success' => true,
            'message' => "If an institutional account matches this email or identifier, password reset instructions and a verification code have been generated."
        ];

        if ($otpCode && (Config::isDebug() || php_sapi_name() === 'cli')) {
            $res['otp_debug_code'] = $otpCode;
            $res['target_email'] = $user['email'];
        }

        return $res;
    }

    /**
     * Complete Password Reset with OTP Code or Token
     */
    public static function resetPassword(string $email, string $otpOrToken, string $newPassword): array
    {
        RateLimitMiddleware::check('reset_pwd', 5, 300);

        if (strlen($newPassword) < 8) {
            throw new RuntimeException("New password must be at least 8 characters in length.");
        }

        $pdo = Database::getConnection();
        $email = strtolower(trim($email));
        $code = trim($otpOrToken);

        $stmt = $pdo->prepare("
            SELECT * FROM password_resets
            WHERE LOWER(email) = ? AND used_at IS NULL
            ORDER BY id DESC
            LIMIT 5
        ");
        $stmt->execute([$email]);
        $resets = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $matchedReset = null;
        foreach ($resets as $r) {
            // Validate time-limited expiry in PHP
            if (strtotime($r['expires_at']) < time()) {
                continue;
            }
            if (password_verify($code, $r['otp_code_hash'] ?? '') || hash_equals($r['token_hash'] ?? '', hash('sha256', $code))) {
                $matchedReset = $r;
                break;
            }
        }

        if (!$matchedReset) {
            RateLimitMiddleware::hit('reset_pwd');
            throw new RuntimeException("Invalid, expired, or previously utilized verification code.");
        }

        // Fetch User
        $userStmt = $pdo->prepare("SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1");
        $userStmt->execute([$email]);
        $userId = $userStmt->fetchColumn();

        if (!$userId) {
            throw new RuntimeException("Associated user account not found.");
        }

        $newHash = password_hash($newPassword, PASSWORD_BCRYPT);

        $pdo->beginTransaction();
        try {
            $upUser = $pdo->prepare("UPDATE users SET password_hash = ?, failed_logins = 0, lock_until = NULL, updated_at = NOW() WHERE id = ?");
            $upUser->execute([$newHash, $userId]);

            $upReset = $pdo->prepare("UPDATE password_resets SET used_at = NOW() WHERE id = ?");
            $upReset->execute([$matchedReset['id']]);

            AuditService::log((int)$userId, 'PASSWORD_RESET_SUCCESS', 'user', (int)$userId, "Password reset successfully via verified token");

            $pdo->commit();
            RateLimitMiddleware::clear('reset_pwd');

            return [
                'success' => true,
                'message' => "Your password has been reset successfully. Please log in with your new password."
            ];
        } catch (\Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Create Cryptographically Secure Persistent Remember-Me Token
     */
    private static function createRememberToken(int $userId): void
    {
        if (php_sapi_name() === 'cli') {
            return;
        }

        try {
            $pdo = Database::getConnection();
            $selector = bin2hex(random_bytes(16));
            $validator = bin2hex(random_bytes(32));
            $tokenHash = hash('sha256', $validator);
            $expiresAt = date('Y-m-d H:i:s', time() + 30 * 86400); // 30 days

            // Clean older expired tokens for user
            $delStmt = $pdo->prepare("DELETE FROM user_tokens WHERE user_id = ? AND expires_at < NOW()");
            $delStmt->execute([$userId]);

            $insStmt = $pdo->prepare("INSERT INTO user_tokens (user_id, selector, token_hash, expires_at) VALUES (?, ?, ?, ?)");
            $insStmt->execute([$userId, $selector, $tokenHash, $expiresAt]);

            $cookieValue = "{$selector}:{$validator}";
            $isSecure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on';

            if (!headers_sent()) {
                setcookie('campuscare_remember', $cookieValue, [
                    'expires'  => time() + 30 * 86400,
                    'path'     => '/',
                    'domain'   => '',
                    'secure'   => $isSecure,
                    'httponly' => true,
                    'samesite' => 'Lax'
                ]);
            }
        } catch (\Exception $e) {
            error_log("Failed creating remember token: " . $e->getMessage());
        }
    }

    /**
     * Validate Persistent Remember-Me Cookie and Restore Authenticated Session
     */
    private static function checkRememberMe(): ?array
    {
        if (empty($_COOKIE['campuscare_remember'])) {
            return null;
        }

        $parts = explode(':', $_COOKIE['campuscare_remember'], 2);
        if (count($parts) !== 2) {
            self::clearRememberMe();
            return null;
        }

        [$selector, $validator] = $parts;
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("
            SELECT ut.*, u.id as user_id, u.is_active, u.role_id
            FROM user_tokens ut
            JOIN users u ON ut.user_id = u.id
            WHERE ut.selector = ? AND ut.expires_at > NOW()
            LIMIT 1
        ");
        $stmt->execute([$selector]);
        $record = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$record || (int)$record['is_active'] !== 1) {
            self::clearRememberMe();
            return null;
        }

        if (!hash_equals($record['token_hash'], hash('sha256', $validator))) {
            // Possible token tampering: revoke this selector immediately
            $del = $pdo->prepare("DELETE FROM user_tokens WHERE selector = ?");
            $del->execute([$selector]);
            self::clearRememberMe();
            return null;
        }

        // Fetch user data
        $userStmt = $pdo->prepare("
            SELECT u.*, r.name as role_name, r.slug as role_slug, d.name as department_name, d.code as department_code
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.id = ?
            LIMIT 1
        ");
        $userStmt->execute([$record['user_id']]);
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            self::clearRememberMe();
            return null;
        }

        // Token rotation: regenerate validator for defense-in-depth against replay attacks
        $newValidator = bin2hex(random_bytes(32));
        $newHash = hash('sha256', $newValidator);
        $upStmt = $pdo->prepare("UPDATE user_tokens SET token_hash = ? WHERE selector = ?");
        $upStmt->execute([$newHash, $selector]);

        $cookieValue = "{$selector}:{$newValidator}";
        $isSecure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on';
        if (!headers_sent()) {
            setcookie('campuscare_remember', $cookieValue, [
                'expires'  => time() + 30 * 86400,
                'path'     => '/',
                'domain'   => '',
                'secure'   => $isSecure,
                'httponly' => true,
                'samesite' => 'Lax'
            ]);
        }

        // Fetch permissions
        $permStmt = $pdo->prepare("
            SELECT p.slug
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = ?
        ");
        $permStmt->execute([$user['role_id']]);
        $permissions = $permStmt->fetchAll(PDO::FETCH_COLUMN);

        unset($user['password_hash']);
        $user['permissions'] = $permissions;

        Session::setUser($user);
        Session::set('permissions', $permissions);

        AuditService::log($user['id'], 'LOGIN_REMEMBER_ME', 'user', $user['id'], "Session restored via persistent remember-me token");

        return $user;
    }

    /**
     * Clear remember-me cookie and remove token from database
     */
    private static function clearRememberMe(): void
    {
        if (!empty($_COOKIE['campuscare_remember'])) {
            $parts = explode(':', $_COOKIE['campuscare_remember'], 2);
            if (count($parts) === 2) {
                try {
                    $pdo = Database::getConnection();
                    $stmt = $pdo->prepare("DELETE FROM user_tokens WHERE selector = ?");
                    $stmt->execute([$parts[0]]);
                } catch (\Exception $e) {
                    // ignore
                }
            }

            if (!headers_sent()) {
                setcookie('campuscare_remember', '', [
                    'expires'  => time() - 3600,
                    'path'     => '/',
                    'domain'   => '',
                    'secure'   => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
                    'httponly' => true,
                    'samesite' => 'Lax'
                ]);
            }
        }
    }

    /**
     * Change Password for authenticated user
     */
    public static function changePassword(int $userId, string $currentPassword, string $newPassword): bool
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $hash = $stmt->fetchColumn();

        if (!$hash || !password_verify($currentPassword, $hash)) {
            throw new RuntimeException("Current password is incorrect.");
        }

        if (strlen($newPassword) < 8) {
            throw new RuntimeException("New password must be at least 8 characters long.");
        }

        $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
        $updateStmt = $pdo->prepare("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?");
        $updateStmt->execute([$newHash, $userId]);

        AuditService::log($userId, 'PASSWORD_CHANGE', 'user', $userId, "Password changed successfully");
        return true;
    }

    /**
     * Update permitted personal profile fields
     */
    public static function updateProfile(int $userId, array $data): array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("UPDATE users SET full_name = ?, phone = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$data['full_name'], $data['phone'] ?? null, $userId]);

        AuditService::log($userId, 'PROFILE_UPDATE', 'user', $userId, "Profile information updated");
        return self::getCurrentUser();
    }
}
