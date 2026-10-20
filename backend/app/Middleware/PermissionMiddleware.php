<?php

namespace App\Middleware;

use App\Helpers\Session;
use App\Helpers\Response;

class PermissionMiddleware
{
    public static function allow(array|string $permissions): void
    {
        $user = AuthMiddleware::handle();
        if (!$user) {
            return;
        }

        $requiredPerms = is_array($permissions) ? $permissions : [$permissions];
        $userPerms = $user['permissions'] ?? Session::get('permissions', []);

        // Administrator role possesses global administrative privileges
        if (($user['role_slug'] ?? Session::getRole()) === 'admin') {
            return;
        }

        // Check if user has at least one of the required permissions
        $hasPermission = false;
        foreach ($requiredPerms as $p) {
            if (in_array($p, $userPerms, true)) {
                $hasPermission = true;
                break;
            }
        }

        if (!$hasPermission) {
            Response::forbidden("Access denied: You lack required authority permission [" . implode(', ', $requiredPerms) . "]");
        }
    }
}
