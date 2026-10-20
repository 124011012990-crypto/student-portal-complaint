<?php

require_once __DIR__ . '/../app/Config/Config.php';
require_once __DIR__ . '/../app/Config/Database.php';

use App\Config\Config;
use App\Config\Database;

Config::load(__DIR__ . '/../.env');

echo "=== CampusCare Database Migration ===\n";

try {
    $dbName = Config::get('DB_DATABASE', 'campuscare_db');
    $rootPdo = Database::getRootConnection();

    $isFresh = in_array('--fresh', $argv, true);
    if ($isFresh) {
        echo "Dropping existing database '{$dbName}' (Fresh requested)...\n";
        $rootPdo->exec("DROP DATABASE IF EXISTS `{$dbName}`;");
    }

    echo "Ensuring database '{$dbName}' exists...\n";
    $rootPdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");

    $pdo = Database::getConnection();

    $schemaFile = __DIR__ . '/schema.sql';
    if (!file_exists($schemaFile)) {
        throw new RuntimeException("Schema file not found at: {$schemaFile}");
    }

    $sql = file_get_contents($schemaFile);

    // Strip comments line by line
    $lines = explode("\n", $sql);
    $cleanLines = [];
    foreach ($lines as $line) {
        $trimmed = trim($line);
        if (str_starts_with($trimmed, '--') || str_starts_with($trimmed, '/*')) {
            continue;
        }
        $cleanLines[] = $line;
    }
    $cleanSql = implode("\n", $cleanLines);

    // Split into individual SQL statements by semicolon
    $statements = array_filter(
        array_map('trim', explode(';', $cleanSql)),
        fn($stmt) => !empty($stmt)
    );

    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    foreach ($statements as $statement) {
        if (stripos($statement, 'CREATE DATABASE') === 0 || stripos($statement, 'USE ') === 0) {
            continue;
        }
        $pdo->exec($statement);
    }
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

    $stmt = $pdo->query("SHOW TABLES;");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Database ready. Total tables: " . count($tables) . "\n";

    // If users table is empty, auto-seed defaults; otherwise sync new permissions and registry
    $userCount = (int) $pdo->query("SELECT COUNT(*) FROM users;")->fetchColumn();
    if ($userCount === 0) {
        echo "Database is empty. Automatically seeding default roles and demo accounts...\n";
        require __DIR__ . '/seed.php';
    } else {
        echo "Existing data preserved. ({$userCount} users registered). Syncing permissions & registry...\n";
        require __DIR__ . '/seed.php';
    }


} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
