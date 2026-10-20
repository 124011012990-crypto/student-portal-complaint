<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Helpers\Response;
use App\Config\Database;
use App\Services\AuditService;
use App\Validators\Validator;
use Exception;
use PDO;

class UserController extends Controller
{
    public function index(): void
    {
        $pdo = Database::getConnection();
        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? min(100, max(5, (int)$_GET['per_page'])) : 15;
        $offset = ($page - 1) * $perPage;

        $where = ["1=1"];
        $params = [];

        if (!empty($_GET['role_id'])) {
            $where[] = "u.role_id = ?";
            $params[] = (int)$_GET['role_id'];
        }
        if (!empty($_GET['department_id'])) {
            $where[] = "u.department_id = ?";
            $params[] = (int)$_GET['department_id'];
        }
        if (!empty($_GET['search'])) {
            $term = '%' . $_GET['search'] . '%';
            $where[] = "(u.username LIKE ? OR u.full_name LIKE ? OR u.email LIKE ? OR u.roll_number LIKE ?)";
            $params = array_merge($params, [$term, $term, $term, $term]);
        }

        $whereSql = implode(" AND ", $where);

        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM users u WHERE {$whereSql}");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $query = "
            SELECT u.id, u.username, u.email, u.full_name, u.phone, u.role_id, u.department_id, u.roll_number, u.is_active, u.created_at,
                   r.name as role_name, r.slug as role_slug,
                   d.name as department_name, d.code as department_code
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE {$whereSql}
            ORDER BY u.created_at DESC
            LIMIT {$perPage} OFFSET {$offset}
        ";

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::success([
            'data'        => $users,
            'total'       => $total,
            'page'        => $page,
            'per_page'    => $perPage,
            'total_pages' => ceil($total / $perPage)
        ]);
    }

    public function store(): void
    {
        $input = $this->getJsonInput();
        $validator = Validator::make($input, [
            'username'  => 'required|min:3|max:60',
            'email'     => 'required|email|max:120',
            'password'  => 'required|min:8',
            'full_name' => 'required|max:120',
            'role_id'   => 'required|integer'
        ]);

        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }

        $pdo = Database::getConnection();

        // Check uniqueness
        $checkStmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
        $checkStmt->execute([$input['username'], $input['email']]);
        if ($checkStmt->fetchColumn()) {
            Response::error('A user with this username or email already exists.', 409);
            return;
        }

        $hash = password_hash($input['password'], PASSWORD_BCRYPT);
        $deptId = !empty($input['department_id']) ? (int)$input['department_id'] : null;
        $roll = !empty($input['roll_number']) ? trim($input['roll_number']) : null;
        $phone = !empty($input['phone']) ? trim($input['phone']) : null;

        $insertStmt = $pdo->prepare("
            INSERT INTO users (username, email, password_hash, full_name, phone, role_id, department_id, roll_number, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
        ");
        $insertStmt->execute([$input['username'], $input['email'], $hash, $input['full_name'], $phone, $input['role_id'], $deptId, $roll]);
        $newId = (int)$pdo->lastInsertId();

        AuditService::log($this->getUserId(), 'USER_CREATE', 'user', $newId, "Created user account '{$input['username']}'");
        Response::success(['id' => $newId], 'User created successfully', 201);
    }

    public function update(string $id): void
    {
        $input = $this->getJsonInput();
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([(int)$id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            Response::notFound('User not found.');
            return;
        }

        $fullName = $input['full_name'] ?? $user['full_name'];
        $phone = $input['phone'] ?? $user['phone'];
        $roleId = !empty($input['role_id']) ? (int)$input['role_id'] : $user['role_id'];
        $deptId = isset($input['department_id']) ? (!empty($input['department_id']) ? (int)$input['department_id'] : null) : $user['department_id'];
        $roll = $input['roll_number'] ?? $user['roll_number'];

        // Protect last active administrator from losing admin role
        $adminRoleStmt = $pdo->query("SELECT id FROM roles WHERE slug = 'admin' LIMIT 1");
        $adminRoleId = (int)$adminRoleStmt->fetchColumn();
        if ((int)$user['role_id'] === $adminRoleId && $roleId !== $adminRoleId && (int)$user['is_active'] === 1) {
            $countStmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE role_id = ? AND is_active = 1");
            $countStmt->execute([$adminRoleId]);
            if ((int)$countStmt->fetchColumn() <= 1) {
                Response::error('Cannot remove administrative privileges from the only active System Administrator.', 400);
                return;
            }
        }

        $updateSql = "UPDATE users SET full_name = ?, phone = ?, role_id = ?, department_id = ?, roll_number = ?";
        $params = [$fullName, $phone, $roleId, $deptId, $roll];

        if (!empty($input['password']) && strlen($input['password']) >= 8) {
            $updateSql .= ", password_hash = ?";
            $params[] = password_hash($input['password'], PASSWORD_BCRYPT);
        }

        $updateSql .= ", updated_at = NOW() WHERE id = ?";
        $params[] = (int)$id;

        $upStmt = $pdo->prepare($updateSql);
        $upStmt->execute($params);

        AuditService::log($this->getUserId(), 'USER_UPDATE', 'user', (int)$id, "Updated user account ID {$id}");
        Response::success(null, 'User updated successfully');
    }

    public function toggleActive(string $id): void
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT id, is_active, role_id FROM users WHERE id = ?");
        $stmt->execute([(int)$id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            Response::notFound('User not found.');
            return;
        }

        // Prevent admin deactivating self
        if ((int)$id === $this->getUserId()) {
            Response::error('You cannot deactivate your own administrative account.', 400);
            return;
        }

        // Protect last active administrator account against accidental lockout
        $adminRoleStmt = $pdo->query("SELECT id FROM roles WHERE slug = 'admin' LIMIT 1");
        $adminRoleId = (int)$adminRoleStmt->fetchColumn();
        if ((int)$user['is_active'] === 1 && (int)$user['role_id'] === $adminRoleId) {
            $countStmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE role_id = ? AND is_active = 1");
            $countStmt->execute([$adminRoleId]);
            if ((int)$countStmt->fetchColumn() <= 1) {
                Response::error('Cannot deactivate the only active System Administrator account in the portal.', 400);
                return;
            }
        }

        $newStatus = (int)$user['is_active'] === 1 ? 0 : 1;
        $upStmt = $pdo->prepare("UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?");
        $upStmt->execute([$newStatus, (int)$id]);

        $statusStr = $newStatus === 1 ? 'activated' : 'deactivated';
        AuditService::log($this->getUserId(), 'USER_STATUS_TOGGLE', 'user', (int)$id, "User {$statusStr}");
        Response::success(['is_active' => $newStatus], "User account {$statusStr}");
    }


    public function roles(): void
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->query("SELECT * FROM roles ORDER BY id ASC");
        Response::success($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function staffList(): void
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->query("
            SELECT u.id, u.full_name, u.email, r.name as role_name, r.slug as role_slug, d.name as department_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE r.slug IN ('officer', 'faculty', 'hod') AND u.is_active = 1
            ORDER BY u.full_name ASC
        ");
        Response::success($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function getPermissionsMatrix(): void
    {
        $pdo = Database::getConnection();
        $roles = $pdo->query("SELECT * FROM roles ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);
        $permissions = $pdo->query("SELECT * FROM permissions ORDER BY module ASC, name ASC")->fetchAll(PDO::FETCH_ASSOC);
        $rolePermRows = $pdo->query("SELECT role_id, permission_id FROM role_permissions")->fetchAll(PDO::FETCH_ASSOC);

        $matrix = [];
        foreach ($rolePermRows as $row) {
            $matrix[$row['role_id']][] = (int)$row['permission_id'];
        }

        Response::success([
            'roles' => $roles,
            'permissions' => $permissions,
            'role_permissions' => $matrix
        ]);
    }

    public function updateRolePermissions(string $roleId): void
    {
        $pdo = Database::getConnection();
        $roleId = (int)$roleId;

        $checkStmt = $pdo->prepare("SELECT id, name FROM roles WHERE id = ?");
        $checkStmt->execute([$roleId]);
        $role = $checkStmt->fetch(PDO::FETCH_ASSOC);
        if (!$role) {
            Response::notFound('Role not found.');
            return;
        }

        $input = $this->getJsonInput();
        $permissionIds = isset($input['permission_ids']) && is_array($input['permission_ids']) ? $input['permission_ids'] : [];

        $pdo->beginTransaction();
        try {
            $delStmt = $pdo->prepare("DELETE FROM role_permissions WHERE role_id = ?");
            $delStmt->execute([$roleId]);

            if (!empty($permissionIds)) {
                $insStmt = $pdo->prepare("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)");
                foreach ($permissionIds as $pId) {
                    $insStmt->execute([$roleId, (int)$pId]);
                }
            }

            $pdo->commit();
            AuditService::log($this->getUserId(), 'ROLE_PERMISSIONS_UPDATE', 'role', $roleId, "Updated permissions for role {$role['name']}");
            Response::success(null, "Permissions for {$role['name']} updated successfully.");
        } catch (Exception $e) {
            $pdo->rollBack();
            Response::error('Failed to update permissions: ' . $e->getMessage(), 500);
        }
    }
}
