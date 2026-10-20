<?php

namespace App\Services;

use App\Config\Database;
use App\Helpers\Security;
use PDO;

class AuditService
{
    public static function log(?int $userId, string $action, string $entityType, ?int $entityId, ?string $details = null): void
    {
        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, details, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())");
            $ip = Security::getClientIp();
            $ua = Security::getUserAgent();
            $stmt->execute([$userId, $action, $entityType, $entityId, $ip, $ua, $details]);
        } catch (\Exception $e) {
            // Fail gracefully to avoid blocking main workflow
            error_log("Audit log failed: " . $e->getMessage());
        }
    }

    public static function getLogs(array $filters = [], int $page = 1, int $perPage = 25): array
    {
        $pdo = Database::getConnection();
        $offset = ($page - 1) * $perPage;

        $where = ["1=1"];
        $params = [];

        if (!empty($filters['user_id'])) {
            $where[] = "a.user_id = ?";
            $params[] = (int) $filters['user_id'];
        }
        if (!empty($filters['action'])) {
            $where[] = "a.action LIKE ?";
            $params[] = '%' . $filters['action'] . '%';
        }
        if (!empty($filters['entity_type'])) {
            $where[] = "a.entity_type = ?";
            $params[] = $filters['entity_type'];
        }

        $whereSql = implode(" AND ", $where);

        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM audit_logs a WHERE {$whereSql}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $query = "SELECT a.*, u.username, u.full_name, r.name as role_name
                  FROM audit_logs a
                  LEFT JOIN users u ON a.user_id = u.id
                  LEFT JOIN roles r ON u.role_id = r.id
                  WHERE {$whereSql}
                  ORDER BY a.created_at DESC
                  LIMIT {$perPage} OFFSET {$offset}";

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'data'        => $logs,
            'total'       => $total,
            'page'        => $page,
            'per_page'    => $perPage,
            'total_pages' => ceil($total / $perPage)
        ];
    }
}
