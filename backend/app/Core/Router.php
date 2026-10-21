<?php

namespace App\Core;

use App\Config\Config;
use App\Helpers\Response;

class Router
{
    private array $routes = [];

    public function add(string $method, string $path, callable|array $handler, array $middlewares = []): void
    {
        $this->routes[] = [
            'method'      => strtoupper($method),
            'path'        => $path,
            'handler'     => $handler,
            'middlewares' => $middlewares
        ];
    }

    public function get(string $path, callable|array $handler, array $middlewares = []): void
    {
        $this->add('GET', $path, $handler, $middlewares);
    }

    public function post(string $path, callable|array $handler, array $middlewares = []): void
    {
        $this->add('POST', $path, $handler, $middlewares);
    }

    public function put(string $path, callable|array $handler, array $middlewares = []): void
    {
        $this->add('PUT', $path, $handler, $middlewares);
    }

    public function delete(string $path, callable|array $handler, array $middlewares = []): void
    {
        $this->add('DELETE', $path, $handler, $middlewares);
    }

    public function dispatch(): void
    {
        self::handleCors();

        $requestMethod = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        if ($requestMethod === 'OPTIONS') {
            http_response_code(204);
            exit;
        }

        $requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

        // Normalize base path if hosted in subfolder (e.g. /campuscare/backend/public)
        // Ensure /api is preserved since API routes are defined with /api prefix
        $rawPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
        if (str_starts_with($rawPath, '/api')) {
            $requestUri = $rawPath;
        } else {
            $scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? ''));
            if ($scriptDir !== '/' && $scriptDir !== '.' && str_starts_with($requestUri, $scriptDir)) {
                $requestUri = substr($requestUri, strlen($scriptDir));
            }
        }
        $requestUri = '/' . trim($requestUri, '/');

        foreach ($this->routes as $route) {
            if ($route['method'] !== $requestMethod) {
                continue;
            }

            // Convert route pattern {id} to regex
            $pattern = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<$1>[^/]+)', $route['path']);
            $pattern = "#^" . $pattern . "$#";

            if (preg_match($pattern, $requestUri, $matches)) {
                // Extract named route params
                $params = array_filter($matches, fn($k) => !is_int($k), ARRAY_FILTER_USE_KEY);

                // Run middlewares
                foreach ($route['middlewares'] as $mw) {
                    if (is_callable($mw)) {
                        call_user_func($mw);
                    }
                }

                // Execute handler
                $handler = $route['handler'];
                if (is_array($handler)) {
                    [$class, $method] = $handler;
                    $controller = new $class();
                    $controller->$method(...array_values($params));
                } elseif (is_callable($handler)) {
                    call_user_func_array($handler, array_values($params));
                }
                return;
            }
        }

        Response::notFound("Endpoint '{$requestMethod} {$requestUri}' does not exist.");
    }

    public static function handleCors(): void
    {
        $origin = rtrim(trim($_SERVER['HTTP_ORIGIN'] ?? ''), '/');
        $rawAllowed = explode(',', (string) Config::get('CORS_ALLOWED_ORIGIN', '*'));
        $allowedOrigins = array_map(fn($o) => rtrim(trim($o), '/'), $rawAllowed);

        if (in_array('*', $allowedOrigins, true)) {
            header('Access-Control-Allow-Origin: ' . ($origin ?: '*'));
        } elseif ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
            header("Access-Control-Allow-Origin: {$origin}");
        }

        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Session-Token');
        header('Access-Control-Max-Age: 86400');
    }
}
