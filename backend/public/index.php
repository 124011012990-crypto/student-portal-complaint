<?php

declare(strict_types=1);

// Autoloader for App namespace
spl_autoload_register(function ($class) {
    $prefix = 'App\\';
    $baseDir = dirname(__DIR__) . '/app/';

    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

    if (file_exists($file)) {
        require_once $file;
    }
});

use App\Config\Config;
use App\Core\Router;
use App\Helpers\Response;
use App\Helpers\Session;
use App\Middleware\AuthMiddleware;
use App\Middleware\RoleMiddleware;
use App\Middleware\PermissionMiddleware;
use App\Middleware\CsrfMiddleware;

// Initialize Configuration
Config::load();

// Handle CORS and preflight OPTIONS request immediately
Router::handleCors();
if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Global Exception Handler
set_exception_handler(function (Throwable $e) {
    error_log("Unhandled exception: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    $msg = Config::isDebug() ? $e->getMessage() : 'An unexpected internal error occurred.';
    Response::error($msg, 500);
});

// Global Error Handler (converts PHP notices/warnings to exceptions in debug or logs them)
set_error_handler(function ($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    error_log("PHP warning: {$message} in {$file}:{$line}");
    if (Config::isDebug()) {
        throw new ErrorException($message, 0, $severity, $file, $line);
    }
    return true;
});

// Initialize Session
Session::start();

// Setup Router
$router = new Router();

// --- Auth Endpoints ---
$router->post('/api/auth/login', ['App\Controllers\AuthController', 'login']);
$router->post('/api/auth/logout', ['App\Controllers\AuthController', 'logout'], [[AuthMiddleware::class, 'handle']]);
$router->get('/api/auth/me', ['App\Controllers\AuthController', 'me'], [[AuthMiddleware::class, 'handle']]);
$router->get('/api/auth/csrf', ['App\Controllers\AuthController', 'csrfToken']);
$router->post('/api/auth/change-password', ['App\Controllers\AuthController', 'changePassword'], [
    [AuthMiddleware::class, 'handle'],
    [CsrfMiddleware::class, 'handle']
]);
$router->post('/api/auth/profile', ['App\Controllers\AuthController', 'updateProfile'], [
    [AuthMiddleware::class, 'handle'],
    [CsrfMiddleware::class, 'handle']
]);

// --- Student Activation (Controlled Verification) & Password Recovery ---
$router->post('/api/auth/activate/initiate', ['App\Controllers\AuthController', 'initiateActivation']);
$router->post('/api/auth/activate/verify', ['App\Controllers\AuthController', 'verifyActivationOtp']);
$router->post('/api/auth/activate/complete', ['App\Controllers\AuthController', 'completeActivation']);
$router->post('/api/auth/forgot-password', ['App\Controllers\AuthController', 'forgotPassword']);
$router->post('/api/auth/reset-password', ['App\Controllers\AuthController', 'resetPassword']);

// --- Dashboard Summary ---
$router->get('/api/dashboard/summary', ['App\Controllers\ComplaintController', 'summary'], [[AuthMiddleware::class, 'handle']]);

// --- Complaints CRUD & Lifecycle ---
$router->get('/api/complaints', ['App\Controllers\ComplaintController', 'index'], [[AuthMiddleware::class, 'handle']]);
$router->post('/api/complaints', ['App\Controllers\ComplaintController', 'store'], [
    [AuthMiddleware::class, 'handle'],
    fn() => RoleMiddleware::allow(['student', 'admin']),
    [CsrfMiddleware::class, 'handle']
]);
$router->get('/api/complaints/{id}', ['App\Controllers\ComplaintController', 'show'], [[AuthMiddleware::class, 'handle']]);
$router->post('/api/complaints/{id}/update', ['App\Controllers\ComplaintController', 'updateStatus'], [
    [AuthMiddleware::class, 'handle'],
    [CsrfMiddleware::class, 'handle']
]);
$router->post('/api/complaints/{id}/assign', ['App\Controllers\ComplaintController', 'assign'], [
    [AuthMiddleware::class, 'handle'],
    fn() => RoleMiddleware::allow(['admin', 'officer', 'hod']),
    [CsrfMiddleware::class, 'handle']
]);
$router->post('/api/complaints/{id}/comments', ['App\Controllers\ComplaintController', 'addComment'], [
    [AuthMiddleware::class, 'handle'],
    [CsrfMiddleware::class, 'handle']
]);
$router->post('/api/complaints/{id}/feedback', ['App\Controllers\ComplaintController', 'submitFeedback'], [
    [AuthMiddleware::class, 'handle'],
    fn() => RoleMiddleware::allow(['student']),
    [CsrfMiddleware::class, 'handle']
]);
$router->post('/api/complaints/{id}/delete', ['App\Controllers\ComplaintController', 'delete'], [
    [AuthMiddleware::class, 'handle'],
    fn() => RoleMiddleware::allow(['admin']),
    [CsrfMiddleware::class, 'handle']
]);
$router->get('/api/complaints/attachments/{id}', ['App\Controllers\ComplaintController', 'downloadAttachment'], [[AuthMiddleware::class, 'handle']]);


// --- Metadata Lookups ---
$router->get('/api/departments', ['App\Controllers\DepartmentController', 'index']);
$router->get('/api/categories', ['App\Controllers\CategoryController', 'index']);
$router->get('/api/admin/roles', ['App\Controllers\UserController', 'roles'], [[AuthMiddleware::class, 'handle']]);
$router->get('/api/admin/roles/permissions', ['App\Controllers\UserController', 'getPermissionsMatrix'], [
    [AuthMiddleware::class, 'handle'],
    fn() => RoleMiddleware::allow(['admin', 'auditor'])
]);
$router->post('/api/admin/roles/{id}/permissions', ['App\Controllers\UserController', 'updateRolePermissions'], [
    [AuthMiddleware::class, 'handle'],
    fn() => RoleMiddleware::allow(['admin']),
    [CsrfMiddleware::class, 'handle']
]);
$router->get('/api/admin/staff', ['App\Controllers\UserController', 'staffList'], [[AuthMiddleware::class, 'handle']]);

// --- In-App Notifications ---
$router->get('/api/notifications', ['App\Controllers\NotificationController', 'index'], [[AuthMiddleware::class, 'handle']]);
$router->post('/api/notifications/read', ['App\Controllers\NotificationController', 'markRead'], [
    [AuthMiddleware::class, 'handle'],
    [CsrfMiddleware::class, 'handle']
]);
$router->post('/api/notifications/{id}/read', ['App\Controllers\NotificationController', 'markRead'], [
    [AuthMiddleware::class, 'handle'],
    [CsrfMiddleware::class, 'handle']
]);

// --- User Management (Admin Only) ---
$router->get('/api/admin/users', ['App\Controllers\UserController', 'index'], [
    [AuthMiddleware::class, 'handle'],
    fn() => RoleMiddleware::allow(['admin'])
]);
$router->post('/api/admin/users', ['App\Controllers\UserController', 'store'], [
    [AuthMiddleware::class, 'handle'],
    fn() => RoleMiddleware::allow(['admin']),
    [CsrfMiddleware::class, 'handle']
]);
$router->post('/api/admin/users/{id}', ['App\Controllers\UserController', 'update'], [
    [AuthMiddleware::class, 'handle'],
    fn() => RoleMiddleware::allow(['admin']),
    [CsrfMiddleware::class, 'handle']
]);
$router->post('/api/admin/users/{id}/toggle', ['App\Controllers\UserController', 'toggleActive'], [
    [AuthMiddleware::class, 'handle'],
    fn() => RoleMiddleware::allow(['admin']),
    [CsrfMiddleware::class, 'handle']
]);

// --- Reports & Analytics ---
$router->get('/api/reports/summary', ['App\Controllers\ReportController', 'summary'], [
    [AuthMiddleware::class, 'handle'],
    fn() => RoleMiddleware::allow(['admin', 'officer', 'hod', 'auditor'])
]);
$router->get('/api/reports/export', ['App\Controllers\ReportController', 'exportCsv'], [
    [AuthMiddleware::class, 'handle'],
    fn() => RoleMiddleware::allow(['admin', 'officer', 'hod', 'auditor'])
]);

// --- Audit Logs ---
$router->get('/api/audit-logs', ['App\Controllers\AuditController', 'index'], [
    [AuthMiddleware::class, 'handle'],
    fn() => RoleMiddleware::allow(['admin', 'auditor'])
]);

// Dispatch the incoming HTTP request
$router->dispatch();
