<?php

declare(strict_types=1);

echo "========================================================\n";
echo "   CampusCare — Live HTTP API Verification on Port 8000 \n";
echo "========================================================\n\n";

$baseUrl = 'http://localhost:8000/api';
$cookieFile = __DIR__ . '/test_cookie.txt';
if (file_exists($cookieFile)) unlink($cookieFile);

// Ensure test state idempotency
spl_autoload_register(function ($class) {
    $prefix = 'App\\';
    $baseDir = dirname(__DIR__) . '/app/';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) return;
    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
    if (file_exists($file)) require_once $file;
});
\App\Config\Config::load(__DIR__ . '/../.env');
$db = \App\Config\Database::getConnection();
$db->exec("UPDATE student_registry SET is_activated = 0 WHERE roll_number = '2026MECH055'");
$db->exec("DELETE FROM users WHERE email = 'rohit.student@campuscare.edu' OR username = '2026MECH055'");

function httpReq(string $method, string $url, ?array $data = null, bool $useCookie = true): array {
    global $cookieFile;
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    if ($useCookie) {
        curl_setopt($ch, CURLOPT_COOKIEJAR, $cookieFile);
        curl_setopt($ch, CURLOPT_COOKIEFILE, $cookieFile);
    }
    $headers = ['Accept: application/json'];
    if ($data !== null) {
        $headers[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $httpCode, 'data' => json_decode((string)$response, true)];
}

$passed = 0;
$failed = 0;
function testAssert(string $desc, bool $cond): void {
    global $passed, $failed;
    if ($cond) {
        echo " [PASS] {$desc}\n";
        $passed++;
    } else {
        echo " [FAIL] {$desc}\n";
        $failed++;
    }
}

// 1. CSRF Token Endpoint
$csrf = httpReq('GET', "{$baseUrl}/auth/csrf");
testAssert("HTTP GET /auth/csrf returns valid token", $csrf['code'] === 200 && !empty($csrf['data']['data']['csrf_token']));

// 2. Student Activation Flow over HTTP for Rohit Verma (2026MECH055)
$init = httpReq('POST', "{$baseUrl}/auth/activate/initiate", [
    'roll_number' => '2026MECH055',
    'email'       => 'rohit.student@campuscare.edu'
]);
testAssert("HTTP POST /auth/activate/initiate succeeds", $init['code'] === 200 && !empty($init['data']['data']['session_token']));

$rohitOtp = $init['data']['data']['otp_debug_code'];
$sessionToken = $init['data']['data']['session_token'];

// Verify OTP
$ver = httpReq('POST', "{$baseUrl}/auth/activate/verify", [
    'roll_number'   => '2026MECH055',
    'email'         => 'rohit.student@campuscare.edu',
    'otp'           => $rohitOtp,
    'session_token' => $sessionToken
]);
testAssert("HTTP POST /auth/activate/verify succeeds", $ver['code'] === 200 && !empty($ver['data']['data']['password_grant_token']));

$grantToken = $ver['data']['data']['password_grant_token'];

// Complete Activation
$comp = httpReq('POST', "{$baseUrl}/auth/activate/complete", [
    'roll_number'          => '2026MECH055',
    'email'                => 'rohit.student@campuscare.edu',
    'password_grant_token' => $grantToken,
    'password'             => 'RohitPass@2026'
]);
testAssert("HTTP POST /auth/activate/complete succeeds", in_array($comp['code'], [200, 201]) && $comp['data']['success'] === true);

// 3. Login with newly activated user over HTTP
$login = httpReq('POST', "{$baseUrl}/auth/login", [
    'username'    => '2026MECH055',
    'password'    => 'RohitPass@2026',
    'remember_me' => true
]);
testAssert("HTTP POST /auth/login with newly activated student credentials succeeds", $login['code'] === 200 && $login['data']['data']['role_slug'] === 'student');

// 4. Authenticated /auth/me check with session cookie
$me = httpReq('GET', "{$baseUrl}/auth/me");
testAssert("HTTP GET /auth/me returns active user session", $me['code'] === 200 && $me['data']['data']['roll_number'] === '2026MECH055');

// 5. Authenticated Dashboard Summary for Student
$summary = httpReq('GET', "{$baseUrl}/dashboard/summary");
testAssert("HTTP GET /dashboard/summary returns student personal metrics", $summary['code'] === 200 && isset($summary['data']['data']['metrics']));

// 6. Forgot Password Flow over HTTP
$fp = httpReq('POST', "{$baseUrl}/auth/forgot-password", [
    'identifier' => 'rohit.student@campuscare.edu'
]);
testAssert("HTTP POST /auth/forgot-password returns generic message & OTP", $fp['code'] === 200 && !empty($fp['data']['data']['otp_debug_code']));

$resetOtp = $fp['data']['data']['otp_debug_code'];

// Complete Reset
$rp = httpReq('POST', "{$baseUrl}/auth/reset-password", [
    'email'        => 'rohit.student@campuscare.edu',
    'otp'          => $resetOtp,
    'new_password' => 'NewRohitPass@2026'
]);
testAssert("HTTP POST /auth/reset-password succeeds", $rp['code'] === 200 && $rp['data']['success'] === true);

// Login with new reset password
$newLogin = httpReq('POST', "{$baseUrl}/auth/login", [
    'username' => 'rohit.student@campuscare.edu',
    'password' => 'NewRohitPass@2026'
]);
testAssert("HTTP POST /auth/login with reset password succeeds", $newLogin['code'] === 200 && $newLogin['data']['data']['roll_number'] === '2026MECH055');

// 7. Logout
$logout = httpReq('POST', "{$baseUrl}/auth/logout");
testAssert("HTTP POST /auth/logout succeeds", $logout['code'] === 200);

if (file_exists($cookieFile)) unlink($cookieFile);

echo "\n========================================================\n";
echo "   HTTP Test Results: {$passed} Passed, {$failed} Failed\n";
echo "========================================================\n";

if ($failed > 0) exit(1);
