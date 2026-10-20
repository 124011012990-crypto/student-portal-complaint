<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Helpers\Response;
use App\Services\NotificationService;

class NotificationController extends Controller
{
    public function index(): void
    {
        $userId = $this->getUserId();
        $limit = isset($_GET['limit']) ? min(50, max(1, (int)$_GET['limit'])) : 20;

        $data = NotificationService::getUserNotifications($userId, $limit);
        Response::success($data);
    }

    public function markRead(string $id = null): void
    {
        $userId = $this->getUserId();
        $notifId = $id !== null && is_numeric($id) ? (int)$id : null;

        NotificationService::markAsRead($userId, $notifId);
        Response::success(null, 'Notification(s) marked as read');
    }
}
