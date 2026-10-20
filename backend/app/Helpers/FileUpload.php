<?php

namespace App\Helpers;

use App\Config\Config;
use RuntimeException;

class FileUpload
{
    public static function process(array $file): array
    {
        if (!isset($file['error']) || is_array($file['error'])) {
            throw new RuntimeException('Invalid file upload parameters.');
        }

        switch ($file['error']) {
            case UPLOAD_ERR_OK:
                break;
            case UPLOAD_ERR_NO_FILE:
                throw new RuntimeException('No file sent.');
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                throw new RuntimeException('Exceeded file size limit.');
            default:
                throw new RuntimeException('Unknown file upload error.');
        }

        $maxBytes = (int) Config::get('UPLOAD_MAX_BYTES', 5242880);
        if ($file['size'] > $maxBytes) {
            throw new RuntimeException("File exceeds maximum allowed size of " . ($maxBytes / 1024 / 1024) . " MB.");
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);

        $allowedMimes = [
            'image/jpeg'      => 'jpg',
            'image/png'       => 'png',
            'image/webp'      => 'webp',
            'application/pdf' => 'pdf'
        ];

        if (!array_key_exists($mimeType, $allowedMimes)) {
            throw new RuntimeException('Invalid file type. Only JPG, PNG, WEBP, and PDF documents are permitted.');
        }

        $ext = $allowedMimes[$mimeType];
        $originalName = basename($file['name']);
        // Sanitize original filename
        $originalName = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $originalName);

        $storedName = bin2hex(random_bytes(16)) . '_' . time() . '.' . $ext;
        $uploadDir = dirname(__DIR__, 2) . '/storage/uploads';

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0750, true);
        }

        $destination = $uploadDir . '/' . $storedName;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            throw new RuntimeException('Failed to move uploaded file to private storage.');
        }

        return [
            'original_name' => $originalName,
            'stored_name'   => $storedName,
            'file_path'     => 'storage/uploads/' . $storedName,
            'file_size'     => (int) $file['size'],
            'file_type'     => $mimeType
        ];
    }
}
