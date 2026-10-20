<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Helpers\Response;
use App\Config\Database;
use PDO;

class DepartmentController extends Controller
{
    public function index(): void
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->query("SELECT id, code, name, description FROM departments ORDER BY name ASC");
        Response::success($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
}
