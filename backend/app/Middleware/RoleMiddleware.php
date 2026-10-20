<?php

namespace App\Middleware;

use App\Helpers\Session;
use App\Helpers\Response;

class RoleMiddleware
{
    public static function allow(array|string $roles): void
    {
        $user = AuthMiddleware::handle();
        if (!$user) {
            return;
        }

        $allowedRoles = is_array($roles) ? $roles : [$roles];
        $currentRole = Session::getRole();

        if (!in_array($currentRole, $allowedRoles, true)) {
            Response::forbidden("Access denied. Required role: " . implode(' or ', $allowedRoles));
        }
    }
}
