<?php

namespace App\Middleware;

use App\Config\Config;
use App\Helpers\Security;
use App\Helpers\Response;

class RateLimitMiddleware
{
    private static function getStoragePath(string $key): string
    {
        $dir = dirname(__DIR__, 2) . '/storage/tmp';
        if (!is_dir($dir)) {
            mkdir($dir, 0750, true);
        }
        return $dir . '/rate_' . md5($key) . '.json';
    }

    public static function check(string $action = 'login', int $max = null, int $decay = null): void
    {
        $max = $max ?? (int) Config::get('RATE_LIMIT_LOGIN_MAX', 5);
        $decay = $decay ?? (int) Config::get('RATE_LIMIT_LOGIN_DECAY', 300);

        $ip = Security::getClientIp();
        $key = "{$action}_{$ip}";
        $file = self::getStoragePath($key);

        $now = time();
        $data = ['count' => 0, 'first_attempt' => $now];

        if (file_exists($file)) {
            $content = json_decode(file_get_contents($file), true);
            if (is_array($content)) {
                if ($now - $content['first_attempt'] < $decay) {
                    $data = $content;
                }
            }
        }

        if ($data['count'] >= $max) {
            $remaining = $decay - ($now - $data['first_attempt']);
            Response::error("Too many failed attempts. Please wait {$remaining} seconds before trying again.", 429);
        }
    }

    public static function hit(string $action = 'login', int $decay = null): void
    {
        $decay = $decay ?? (int) Config::get('RATE_LIMIT_LOGIN_DECAY', 300);
        $ip = Security::getClientIp();
        $key = "{$action}_{$ip}";
        $file = self::getStoragePath($key);

        $now = time();
        $data = ['count' => 1, 'first_attempt' => $now];

        if (file_exists($file)) {
            $content = json_decode(file_get_contents($file), true);
            if (is_array($content) && ($now - $content['first_attempt'] < $decay)) {
                $data = [
                    'count' => $content['count'] + 1,
                    'first_attempt' => $content['first_attempt']
                ];
            }
        }

        file_put_contents($file, json_encode($data), LOCK_EX);
    }

    public static function clear(string $action = 'login'): void
    {
        $ip = Security::getClientIp();
        $key = "{$action}_{$ip}";
        $file = self::getStoragePath($key);

        if (file_exists($file)) {
            @unlink($file);
        }
    }
}
