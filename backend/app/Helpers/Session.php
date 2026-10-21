<?php

namespace App\Helpers;

use App\Config\Config;

class Session
{
    private static bool $started = false;
    private static array $cliSession = [];

    public static function start(): void
    {
        if (self::$started || session_status() === PHP_SESSION_ACTIVE) {
            self::$started = true;
            return;
        }

        if (php_sapi_name() === 'cli') {
            self::$started = true;
            return;
        }

        if (!headers_sent()) {
            $lifetime = (int) Config::get('SESSION_LIFETIME', 7200);
            $isSecure = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on')
                || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https')
                || (Config::get('APP_ENV') === 'production');

            // Cross-origin AJAX (Vercel -> Render) requires SameSite=None and Secure=true
            $sameSite = $isSecure ? 'None' : 'Lax';

            session_set_cookie_params([
                'lifetime' => $lifetime,
                'path'     => '/',
                'domain'   => '',
                'secure'   => $isSecure,
                'httponly' => true,
                'samesite' => $sameSite
            ]);

            ini_set('session.use_only_cookies', '1');
            ini_set('session.use_strict_mode', '1');
            ini_set('session.gc_maxlifetime', (string)$lifetime);
        }

        if (session_status() !== PHP_SESSION_ACTIVE && !headers_sent()) {
            session_start();
        }

        self::$started = true;
    }

    public static function regenerate(): void
    {
        self::start();
        if (php_sapi_name() !== 'cli' && session_status() === PHP_SESSION_ACTIVE && !headers_sent()) {
            session_regenerate_id(true);
        }
    }

    public static function set(string $key, mixed $value): void
    {
        self::start();
        if (php_sapi_name() === 'cli') {
            self::$cliSession[$key] = $value;
        } else {
            $_SESSION[$key] = $value;
        }
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        self::start();
        if (php_sapi_name() === 'cli') {
            return self::$cliSession[$key] ?? $default;
        }
        return $_SESSION[$key] ?? $default;
    }

    public static function has(string $key): bool
    {
        self::start();
        if (php_sapi_name() === 'cli') {
            return isset(self::$cliSession[$key]);
        }
        return isset($_SESSION[$key]);
    }

    public static function remove(string $key): void
    {
        self::start();
        if (php_sapi_name() === 'cli') {
            unset(self::$cliSession[$key]);
        } else {
            unset($_SESSION[$key]);
        }
    }

    public static function destroy(): void
    {
        self::start();
        if (php_sapi_name() === 'cli') {
            self::$cliSession = [];
            self::$started = false;
            return;
        }

        $_SESSION = [];
        if (ini_get("session.use_cookies") && !headers_sent()) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params["path"],
                $params["domain"],
                $params["secure"],
                $params["httponly"]
            );
        }

        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
        self::$started = false;
    }

    public static function setUser(array $user): void
    {
        self::start();
        self::regenerate();
        self::set('user', $user);
        self::set('user_id', $user['id']);
        self::set('role', $user['role_slug'] ?? $user['role'] ?? 'student');
    }

    public static function getUser(): ?array
    {
        self::start();
        return self::get('user');
    }

    public static function getUserId(): ?int
    {
        self::start();
        return self::get('user_id');
    }

    public static function getRole(): ?string
    {
        self::start();
        return self::get('role');
    }

    public static function isLoggedIn(): bool
    {
        self::start();
        return self::has('user_id');
    }
}
