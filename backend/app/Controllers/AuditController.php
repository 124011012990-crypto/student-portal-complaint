<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Helpers\Response;
use App\Services\AuditService;

class AuditController extends Controller
{
    public function index(): void
    {
        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? min(100, max(5, (int)$_GET['per_page'])) : 25;

        $filters = [
            'user_id'     => $_GET['user_id'] ?? null,
            'action'      => $_GET['action'] ?? null,
            'entity_type' => $_GET['entity_type'] ?? null,
        ];

        $data = AuditService::getLogs($filters, $page, $perPage);
        Response::success($data);
    }
}
