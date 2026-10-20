<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Helpers\Response;
use App\Config\Database;
use PDO;

class CategoryController extends Controller
{
    public function index(): void
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->query("
            SELECT c.id, c.name, c.slug, c.description, c.sla_days, c.department_id,
                   d.name as department_name, d.code as department_code
            FROM categories c
            LEFT JOIN departments d ON c.department_id = d.id
            WHERE c.is_active = 1
            ORDER BY c.name ASC
        ");
        Response::success($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
}
