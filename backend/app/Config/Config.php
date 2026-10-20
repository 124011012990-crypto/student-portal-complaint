<?php

namespace App\Config;

class Config
{
    private static array $settings = [];
    private static bool $loaded = false;

    public static function load(string $envPath = null): void
    {
        if (self::$loaded) {
            return;
        }

        // Set safe defaults
        self::$settings = [
            'APP_NAME' => 'CampusCare',
            'APP_ENV' => 'development',
            'APP_DEBUG' => true,
            'APP_URL' => 'http://localhost:8000',
            'FRONTEND_URL' => 'http://localhost:8080',
            'DB_HOST' => '127.0.0.1',
            'DB_PORT' => '3306',
            'DB_DATABASE' => 'campuscare_db',
            'DB_USERNAME' => 'root',
            'DB_PASSWORD' => '',
            'DB_CHARSET' => 'utf8mb4',
            'SESSION_LIFETIME' => 7200,
            'CSRF_SECRET' => 'campuscare_default_secret_key_change_me_93817',
            'CORS_ALLOWED_ORIGIN' => '*',
            'RATE_LIMIT_LOGIN_MAX' => 5,
            'RATE_LIMIT_LOGIN_DECAY' => 300,
            'UPLOAD_MAX_BYTES' => 5242880,
            'ALLOWED_UPLOAD_MIME' => 'image/jpeg,image/png,image/webp,application/pdf'
        ];

        if ($envPath === null) {
            $possiblePaths = [
                dirname(__DIR__, 2) . '/.env',
                dirname(__DIR__, 3) . '/.env',
            ];
            foreach ($possiblePaths as $p) {
                if (file_exists($p)) {
                    $envPath = $p;
                    break;
                }
            }
        }

        if ($envPath && file_exists($envPath)) {
            $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || str_starts_with($line, '#')) {
                    continue;
                }
                if (str_contains($line, '=')) {
                    [$key, $value] = explode('=', $line, 2);
                    $key = trim($key);
                    $value = trim($value);

                    // Strip surrounding quotes
                    if ((str_starts_with($value, '"') && str_ends_with($value, '"')) ||
                        (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
                        $value = substr($value, 1, -1);
                    }

                    // Cast booleans
                    if (strtolower($value) === 'true') {
                        $value = true;
                    } elseif (strtolower($value) === 'false') {
                        $value = false;
                    } elseif (is_numeric($value) && !in_array($key, ['DB_PASSWORD', 'CSRF_SECRET'])) {
                        $value = (int)$value;
                    }

                    self::$settings[$key] = $value;
                    if (!isset($_ENV[$key])) {
                        $_ENV[$key] = $value;
                    }
                }
            }
        }

        self::$loaded = true;
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        if (!self::$loaded) {
            self::load();
        }

        return self::$settings[$key] ?? $_ENV[$key] ?? $default;
    }

    public static function isDebug(): bool
    {
        return (bool) self::get('APP_DEBUG', false);
    }
}
