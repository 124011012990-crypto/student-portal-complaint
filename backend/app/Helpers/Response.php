<?php

namespace App\Helpers;

use App\Config\Config;

class Response
{
    public static function json(mixed $data, int $status = 200, array $headers = []): void
    {
        // Clear any previous output buffers to ensure pure JSON
        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: SAMEORIGIN');
        header('X-XSS-Protection: 1; mode=block');

        foreach ($headers as $key => $val) {
            header("{$key}: {$val}");
        }

        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function success(mixed $data = null, string $message = 'Operation successful', int $status = 200, array $extra = []): void
    {
        $payload = array_merge([
            'success' => true,
            'message' => $message,
            'data'    => $data
        ], $extra);

        self::json($payload, $status);
    }

    public static function error(string $message = 'An error occurred', int $status = 400, ?array $errors = null): void
    {
        $payload = [
            'success' => false,
            'message' => $message
        ];

        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        self::json($payload, $status);
    }

    public static function validationError(array $errors, string $message = 'Validation failed'): void
    {
        self::error($message, 422, $errors);
    }

    public static function unauthorized(string $message = 'Authentication required'): void
    {
        self::error($message, 401);
    }

    public static function forbidden(string $message = 'Access denied'): void
    {
        self::error($message, 403);
    }

    public static function notFound(string $message = 'Resource not found'): void
    {
        self::error($message, 404);
    }
}
