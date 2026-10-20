<?php

namespace App\Middleware;

use App\Helpers\Security;
use App\Helpers\Response;

class CsrfMiddleware
{
    public static function handle(): void
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        if (in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
            return;
        }

        // Exempt initial login if token is not yet established, but validate if token is present
        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
        if (str_ends_with($uri, '/api/auth/login')) {
            return;
        }

        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
        if (!$token && isset($_POST['csrf_token'])) {
            $token = $_POST['csrf_token'];
        }

        if (!$token) {
            $input = json_decode(file_get_contents('php://input'), true);
            if (is_array($input) && isset($input['csrf_token'])) {
                $token = $input['csrf_token'];
            }
        }

        if (!Security::validateCsrfToken($token)) {
            Response::error('Invalid or missing CSRF security token.', 403);
        }
    }
}
