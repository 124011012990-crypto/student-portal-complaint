<?php

namespace App\Config;

use PDO;
use PDOException;
use RuntimeException;

class Database
{
    private static ?PDO $connection = null;

    public static function getConnection(): PDO
    {
        if (self::$connection === null) {
            Config::load();

            $host = Config::get('DB_HOST', '127.0.0.1');
            $port = Config::get('DB_PORT', 3306);
            $db   = Config::get('DB_DATABASE', 'campuscare_db');
            $user = Config::get('DB_USERNAME', 'root');
            $pass = Config::get('DB_PASSWORD', '');
            $charset = Config::get('DB_CHARSET', 'utf8mb4');

            $dsn = "mysql:host={$host};port={$port};dbname={$db};charset={$charset}";

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$charset} COLLATE utf8mb4_unicode_ci"
            ];

            try {
                self::$connection = new PDO($dsn, $user, $pass, $options);
            } catch (PDOException $e) {
                // If database doesn't exist yet, allow fallback connect to host only for migration
                throw new RuntimeException("Database connection failed: " . $e->getMessage(), (int)$e->getCode());
            }
        }

        return self::$connection;
    }

    public static function getRootConnection(): PDO
    {
        Config::load();

        $host = Config::get('DB_HOST', '127.0.0.1');
        $port = Config::get('DB_PORT', 3306);
        $user = Config::get('DB_USERNAME', 'root');
        $pass = Config::get('DB_PASSWORD', '');
        $charset = Config::get('DB_CHARSET', 'utf8mb4');

        $dsn = "mysql:host={$host};port={$port};charset={$charset}";

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        return new PDO($dsn, $user, $pass, $options);
    }
}
