<?php
/**
 * CampusCare Unified Development Router
 * Serves both the Frontend and Backend API through a single port (8000)
 * Eliminates CORS issues and runs directly inside the active terminal without spawning new cmd windows.
 */

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));

// 1. Backend REST API routes
if (str_starts_with($uri, '/api')) {
    require __DIR__ . '/backend/public/index.php';
    exit;
}

// 2. Default route to index.html
if ($uri === '/' || $uri === '') {
    $uri = '/index.html';
}

// 3. Static frontend file handling
$filePath = __DIR__ . '/frontend' . $uri;

if (file_exists($filePath) && !is_dir($filePath)) {
    $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
    $mimes = [
        'html'  => 'text/html; charset=utf-8',
        'css'   => 'text/css; charset=utf-8',
        'js'    => 'application/javascript; charset=utf-8',
        'json'  => 'application/json; charset=utf-8',
        'png'   => 'image/png',
        'jpg'   => 'image/jpeg',
        'jpeg'  => 'image/jpeg',
        'webp'  => 'image/webp',
        'svg'   => 'image/svg+xml',
        'ico'   => 'image/x-icon',
        'pdf'   => 'application/pdf',
        'woff'  => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf'   => 'font/ttf'
    ];

    $mime = $mimes[$ext] ?? 'application/octet-stream';
    header("Content-Type: {$mime}");
    header("X-Content-Type-Options: nosniff");
    readfile($filePath);
    exit;
}

// 4. 404 Fallback
http_response_code(404);
$notFoundPage = __DIR__ . '/frontend/404.html';
if (file_exists($notFoundPage)) {
    header("Content-Type: text/html; charset=utf-8");
    readfile($notFoundPage);
    exit;
}

echo "404 Not Found";
