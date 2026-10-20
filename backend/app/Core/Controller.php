<?php

namespace App\Core;

use App\Helpers\Session;

abstract class Controller
{
    protected function getJsonInput(): array
    {
        $raw = file_get_contents('php://input');
        if (empty($raw)) {
            return $_POST;
        }

        $decoded = json_decode($raw, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return array_merge($_POST, $decoded);
        }

        return $_POST;
    }

    protected function getCurrentUser(): ?array
    {
        return Session::getUser();
    }

    protected function getUserId(): ?int
    {
        return Session::getUserId();
    }

    protected function getUserRole(): ?string
    {
        return Session::getRole();
    }

    protected function getUserDeptId(): ?int
    {
        $user = Session::getUser();
        return $user['department_id'] ?? null;
    }
}
