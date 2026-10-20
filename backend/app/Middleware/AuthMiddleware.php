<?php

namespace App\Middleware;

use App\Helpers\Session;
use App\Helpers\Response;

class AuthMiddleware
{
    public static function handle(): ?array
    {
        Session::start();
        if (!Session::isLoggedIn()) {
            Response::unauthorized('Authentication required. Please log in.');
            return null;
        }

        return Session::getUser();
    }
}
