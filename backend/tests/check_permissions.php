<?php

declare(strict_types=1);

spl_autoload_register(function ($class) {
    $prefix = 'App\\';
    $baseDir = dirname(__DIR__) . '/app/';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) return;
    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
    if (file_exists($file)) require_once $file;
});

use App\Config\Config;
use App\Config\Database;

Config::load(dirname(__DIR__) . '/.env');
$pdo = Database::getConnection();

echo "========================================================================\n";
echo " CampusCare RBAC: LIVE DATABASE PERMISSION CHECK FOR ALL ROLES\n";
echo "========================================================================\n\n";

// 1. Specifically get Student Role Permissions
$studentStmt = $pdo->prepare("
    SELECT p.slug as permission_key, p.name as permission_name, p.description
    FROM roles r
    JOIN role_permissions rp ON r.id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE r.slug = 'student'
    ORDER BY p.slug ASC
");
$studentStmt->execute();
$studentPerms = $studentStmt->fetchAll(PDO::FETCH_ASSOC);

echo "🎯 [ROLE: STUDENT] GRANTED PERMISSIONS IN DATABASE:\n";
echo "------------------------------------------------------------------------\n";
printf("%-30s | %-25s | %s\n", "Permission Key", "Permission Name", "Description");
echo "------------------------------------------------------------------------\n";
foreach ($studentPerms as $sp) {
    printf("%-30s | %-25s | %s\n", $sp['permission_key'], $sp['permission_name'], $sp['description']);
}
echo "------------------------------------------------------------------------\n";
echo "Total Permissions Granted to Student: " . count($studentPerms) . "\n\n";

// 2. Denied Permissions for Student
$deniedStmt = $pdo->prepare("
    SELECT p.slug as permission_key, p.name as permission_name, p.description
    FROM permissions p
    WHERE p.id NOT IN (
        SELECT rp.permission_id 
        FROM role_permissions rp 
        JOIN roles r ON rp.role_id = r.id 
        WHERE r.slug = 'student'
    )
    ORDER BY p.slug ASC
");
$deniedStmt->execute();
$deniedPerms = $deniedStmt->fetchAll(PDO::FETCH_ASSOC);

echo "🚫 [ROLE: STUDENT] EXPLICITLY DENIED / RESTRICTED PERMISSIONS:\n";
echo "------------------------------------------------------------------------\n";
foreach ($deniedPerms as $dp) {
    printf(" ❌ %-28s (Reason: Student cannot %s)\n", $dp['permission_key'], strtolower($dp['permission_name']));
}
echo "------------------------------------------------------------------------\n";
echo "Total Denied Permissions for Student: " . count($deniedPerms) . "\n\n";

// 3. Complete 6-Role Comparison Matrix
echo "========================================================================\n";
echo " 📊 COMPLETE 6-ROLE RBAC ACCESS MATRIX (FROM LIVE DATABASE)\n";
echo "========================================================================\n";

$rolesStmt = $pdo->query("SELECT id, name, slug FROM roles ORDER BY id ASC");
$roles = $rolesStmt->fetchAll(PDO::FETCH_ASSOC);

$allPermsStmt = $pdo->query("SELECT id, slug, name FROM permissions ORDER BY slug ASC");
$allPerms = $allPermsStmt->fetchAll(PDO::FETCH_ASSOC);

// Map of role_id => [permission_slugs]
$matrixStmt = $pdo->query("
    SELECT r.slug as role_slug, p.slug as perm_slug
    FROM role_permissions rp
    JOIN roles r ON rp.role_id = r.id
    JOIN permissions p ON rp.permission_id = p.id
");
$matrix = [];
while ($row = $matrixStmt->fetch(PDO::FETCH_ASSOC)) {
    $matrix[$row['role_slug']][$row['perm_slug']] = true;
}

printf("%-28s | %-7s | %-7s | %-7s | %-7s | %-7s | %-7s\n", 
    "Permission Identifier", "Student", "Faculty", "HOD", "Officer", "Admin", "Auditor"
);
echo str_repeat("-", 80) . "\n";

foreach ($allPerms as $perm) {
    $slug = $perm['slug'];
    printf("%-28s | %-7s | %-7s | %-7s | %-7s | %-7s | %-7s\n",
        $slug,
        isset($matrix['student'][$slug]) ? "  ✅   " : "  —    ",
        isset($matrix['faculty'][$slug]) ? "  ✅   " : "  —    ",
        isset($matrix['hod'][$slug])     ? "  ✅   " : "  —    ",
        isset($matrix['officer'][$slug]) ? "  ✅   " : "  —    ",
        isset($matrix['admin'][$slug])   ? "  ✅   " : "  —    ",
        isset($matrix['auditor'][$slug]) ? "  ✅   " : "  —    "
    );
}
echo str_repeat("=", 80) . "\n";
