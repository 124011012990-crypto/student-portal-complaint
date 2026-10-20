<?php

namespace App\Helpers;

use App\Config\Config;

class Security
{
    public static function generateCsrfToken(): string
    {
        Session::start();
        $token = Session::get('csrf_token');
        if (!$token) {
            $token = bin2hex(random_bytes(32));
            Session::set('csrf_token', $token);
        }
        return $token;
    }

    public static function validateCsrfToken(?string $token): bool
    {
        Session::start();
        $stored = Session::get('csrf_token');
        if (!$stored || !$token) {
            return false;
        }
        return hash_equals($stored, $token);
    }

    public static function escapeHtml(?string $input): string
    {
        if ($input === null) {
            return '';
        }
        return htmlspecialchars($input, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    public static function sanitizeString(?string $input): string
    {
        if ($input === null) {
            return '';
        }
        $str = strip_tags($input);
        return trim($str);
    }

    public static function sanitizeCsvValue(mixed $value): string
    {
        if ($value === null) {
            return '';
        }
        $str = (string) $value;
        // Formula injection protection: prepend single quote if value begins with dangerous characters
        if (preg_match('/^[=\+\-@\t\r]/', $str)) {
            $str = "'" . $str;
        }
        // Escape quotes
        $str = str_replace('"', '""', $str);
        return '"' . $str . '"';
    }

    public static function getClientIp(): string
    {
        $headers = [
            'HTTP_CF_CONNECTING_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_REAL_IP',
            'REMOTE_ADDR'
        ];

        foreach ($headers as $h) {
            if (!empty($_SERVER[$h])) {
                $ips = explode(',', $_SERVER[$h]);
                $ip = trim($ips[0]);
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }

        return '127.0.0.1';
    }

    public static function getUserAgent(): string
    {
        return substr($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', 0, 250);
    }
}
