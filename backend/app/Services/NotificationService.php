<?php

namespace App\Services;

use App\Config\Database;
use PDO;

class NotificationService
{
    public static function send(int $userId, string $title, string $message, ?string $link = null, string $type = 'info'): void
    {
        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message, link, type, is_read, created_at)
                VALUES (?, ?, ?, ?, ?, 0, NOW())");
            $stmt->execute([$userId, $title, $message, $link, $type]);
        } catch (\Exception $e) {
            error_log("Notification failed: " . $e->getMessage());
        }
    }

    public static function getUserNotifications(int $userId, int $limit = 20): array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?");
        $stmt->bindValue(1, $userId, PDO::PARAM_INT);
        $stmt->bindValue(2, $limit, PDO::PARAM_INT);
        $stmt->execute();
        $notifs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $unreadStmt = $pdo->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0");
        $unreadStmt->execute([$userId]);
        $unreadCount = (int) $unreadStmt->fetchColumn();

        return [
            'notifications' => $notifs,
            'unread_count'  => $unreadCount
        ];
    }

    public static function markAsRead(int $userId, ?int $notifId = null): void
    {
        $pdo = Database::getConnection();
        if ($notifId !== null) {
            $stmt = $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?");
            $stmt->execute([$notifId, $userId]);
        } else {
            $stmt = $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?");
            $stmt->execute([$userId]);
        }
    }
}
