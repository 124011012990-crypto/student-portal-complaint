<?php

namespace App\Services;

use App\Config\Database;
use App\Helpers\Session;
use App\Helpers\Security;
use PDO;
use RuntimeException;

class ComplaintService
{
    public static function generateReferenceNumber(): string
    {
        $pdo = Database::getConnection();
        $year = date('Y');
        $random = strtoupper(bin2hex(random_bytes(3)));
        $ref = "CC-{$year}-{$random}";

        // Ensure unique
        $stmt = $pdo->prepare("SELECT id FROM complaints WHERE reference_number = ?");
        $stmt->execute([$ref]);
        if ($stmt->fetchColumn()) {
            return self::generateReferenceNumber();
        }

        return $ref;
    }

    public static function create(array $data, int $studentId): array
    {
        $pdo = Database::getConnection();

        // Fetch category to calculate SLA due date
        $catStmt = $pdo->prepare("SELECT sla_days, department_id FROM categories WHERE id = ? AND is_active = 1");
        $catStmt->execute([$data['category_id']]);
        $cat = $catStmt->fetch(PDO::FETCH_ASSOC);
        if (!$cat) {
            throw new RuntimeException("Selected category is invalid or inactive.");
        }

        // Department determination: use requested department or category's default department
        $departmentId = (int)($data['department_id'] ?? $cat['department_id']);
        if (!$departmentId) {
            // Default to ADMIN department if not specified
            $deptStmt = $pdo->query("SELECT id FROM departments WHERE code = 'ADMIN' LIMIT 1");
            $departmentId = (int)$deptStmt->fetchColumn();
        }

        $slaDays = (int)$cat['sla_days'];
        $dueDate = date('Y-m-d H:i:s', strtotime("+{$slaDays} days 17:00:00"));

        $ref = self::generateReferenceNumber();
        $isAnonymous = !empty($data['is_anonymous']) || ($data['confidentiality_level'] ?? '') === 'Anonymous' ? 1 : 0;
        $confLevel = $data['confidentiality_level'] ?? ($isAnonymous ? 'Anonymous' : 'Standard');

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("
                INSERT INTO complaints (
                    reference_number, student_id, department_id, category_id, subcategory,
                    title, description, priority, confidentiality_level, is_anonymous,
                    status, due_date, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted', ?, NOW(), NOW())
            ");

            $stmt->execute([
                $ref,
                $studentId,
                $departmentId,
                $data['category_id'],
                $data['subcategory'] ?? null,
                $data['title'],
                $data['description'],
                $data['priority'] ?? 'Medium',
                $confLevel,
                $isAnonymous,
                $dueDate
            ]);

            $complaintId = (int) $pdo->lastInsertId();

            // Record status history
            $histStmt = $pdo->prepare("
                INSERT INTO complaint_status_history (complaint_id, changed_by_user_id, old_status, new_status, reason, created_at)
                VALUES (?, ?, 'None', 'Submitted', 'Grievance submitted by student', NOW())
            ");
            $histStmt->execute([$complaintId, $studentId]);

            // Handle optional initial attachment
            if (!empty($data['attachment'])) {
                $att = $data['attachment'];
                $attStmt = $pdo->prepare("
                    INSERT INTO complaint_attachments (complaint_id, uploaded_by_user_id, file_name, stored_file_name, file_path, file_size, file_type, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                ");
                $attStmt->execute([
                    $complaintId,
                    $studentId,
                    $att['original_name'],
                    $att['stored_name'],
                    $att['file_path'],
                    $att['file_size'],
                    $att['file_type']
                ]);
            }

            // Create notification for Grievance Officers
            $officerStmt = $pdo->query("SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.slug = 'officer'");
            $officerIds = $officerStmt->fetchAll(PDO::FETCH_COLUMN);
            foreach ($officerIds as $oId) {
                NotificationService::send(
                    $oId,
                    "New Grievance Submitted",
                    "A new grievance [{$ref}] '{$data['title']}' has been registered.",
                    "complaint-details.html?ref={$ref}",
                    "warning"
                );
            }

            // Audit
            AuditService::log($studentId, 'COMPLAINT_CREATE', 'complaint', $complaintId, "Grievance {$ref} submitted");

            $pdo->commit();
            return self::getByRef($ref, $studentId, 'student');
        } catch (\Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public static function listComplaints(array $filters, int $userId, string $role, ?int $userDeptId, int $page = 1, int $perPage = 15): array
    {
        $pdo = Database::getConnection();
        $offset = ($page - 1) * $perPage;

        $where = ["1=1"];
        $params = [];

        // Role-based scope enforcement
        if ($role === 'student') {
            $where[] = "c.student_id = ?";
            $params[] = $userId;
        } elseif ($role === 'faculty') {
            $where[] = "(c.assigned_to_user_id = ? AND c.confidentiality_level != 'Confidential')";
            $params[] = $userId;
        } elseif ($role === 'hod') {
            $where[] = "((c.department_id = ? OR c.assigned_to_dept_id = ?) AND c.confidentiality_level != 'Confidential')";
            $params[] = $userDeptId;
            $params[] = $userDeptId;
        } elseif ($role === 'auditor') {
            // Auditors see all non-confidential cases
            $where[] = "c.confidentiality_level != 'Confidential'";
        }
        // officer and admin see all

        // Filter: Status
        if (!empty($filters['status'])) {
            $where[] = "c.status = ?";
            $params[] = $filters['status'];
        }

        // Filter: Category
        if (!empty($filters['category_id'])) {
            $where[] = "c.category_id = ?";
            $params[] = (int) $filters['category_id'];
        }

        // Filter: Priority
        if (!empty($filters['priority'])) {
            $where[] = "c.priority = ?";
            $params[] = $filters['priority'];
        }

        // Filter: Department
        if (!empty($filters['department_id'])) {
            $where[] = "c.department_id = ?";
            $params[] = (int) $filters['department_id'];
        }

        // Filter: Search keyword
        if (!empty($filters['search'])) {
            $term = '%' . $filters['search'] . '%';
            $where[] = "(c.reference_number LIKE ? OR c.title LIKE ? OR c.description LIKE ?)";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $whereSql = implode(" AND ", $where);

        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM complaints c WHERE {$whereSql}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $query = "
            SELECT c.*,
                   u.full_name as student_name, u.email as student_email, u.roll_number,
                   d.name as department_name, d.code as department_code,
                   cat.name as category_name,
                   assigned_u.full_name as assigned_to_name
            FROM complaints c
            JOIN users u ON c.student_id = u.id
            JOIN departments d ON c.department_id = d.id
            JOIN categories cat ON c.category_id = cat.id
            LEFT JOIN users assigned_u ON c.assigned_to_user_id = assigned_u.id
            WHERE {$whereSql}
            ORDER BY c.created_at DESC
            LIMIT {$perPage} OFFSET {$offset}
        ";

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $complaints = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Sanitize anonymity if requester is not admin/officer and not the student themselves
        foreach ($complaints as &$c) {
            if ($c['is_anonymous'] && $role !== 'admin' && $role !== 'officer' && (int)$c['student_id'] !== $userId) {
                $c['student_name'] = 'Anonymous Student';
                $c['student_email'] = 'anonymous@campuscare.edu';
                $c['roll_number'] = 'HIDDEN';
            }
            // Staff identity protection: Students cannot view investigating staff details
            if ($role === 'student') {
                $c['assigned_to_name'] = null;
                $c['assigned_to_user_id'] = null;
            }
        }

        return [
            'data'        => $complaints,
            'total'       => $total,
            'page'        => $page,
            'per_page'    => $perPage,
            'total_pages' => ceil($total / $perPage)
        ];
    }

    public static function getByRef(string $ref, int $userId, string $role, ?int $userDeptId = null): array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            SELECT c.*,
                   u.full_name as student_name, u.email as student_email, u.roll_number,
                   d.name as department_name, d.code as department_code,
                   cat.name as category_name, cat.sla_days,
                   assigned_u.full_name as assigned_to_name, assigned_u.email as assigned_to_email,
                   assigned_d.name as assigned_dept_name
            FROM complaints c
            JOIN users u ON c.student_id = u.id
            JOIN departments d ON c.department_id = d.id
            JOIN categories cat ON c.category_id = cat.id
            LEFT JOIN users assigned_u ON c.assigned_to_user_id = assigned_u.id
            LEFT JOIN departments assigned_d ON c.assigned_to_dept_id = assigned_d.id
            WHERE c.reference_number = ?
            LIMIT 1
        ");
        $stmt->execute([$ref]);
        $c = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$c) {
            throw new RuntimeException("Grievance reference '{$ref}' not found.");
        }

        // Authorization validation
        if ($role === 'student' && (int)$c['student_id'] !== $userId) {
            throw new RuntimeException("Access denied: You can only view your own grievances.");
        }
        if ($role === 'faculty' && (int)$c['assigned_to_user_id'] !== $userId) {
            throw new RuntimeException("Access denied: You are not assigned to this grievance.");
        }
        // Staff conduct complaints: General faculty members cannot access complaints regarding staff conduct
        if ($role === 'faculty' && isset($c['category_name']) && stripos($c['category_name'], 'staff') !== false) {
            throw new RuntimeException("Access restricted: Staff conduct grievances are managed exclusively by Administration.");
        }
        if ($role === 'hod' && (int)$c['department_id'] !== $userDeptId && (int)$c['assigned_to_dept_id'] !== $userDeptId) {
            throw new RuntimeException("Access denied: This grievance belongs outside your department.");
        }
        if ($c['confidentiality_level'] === 'Confidential') {
            if (!in_array($role, ['admin', 'officer']) && (int)$c['student_id'] !== $userId) {
                AuditService::log($userId, 'UNAUTHORIZED_ACCESS_ATTEMPT', 'complaint', (int)$c['id'], "Blocked attempt to view confidential grievance {$ref} by role {$role}");
                throw new RuntimeException("Access denied: This grievance is confidential and restricted.");
            }
            if (in_array($role, ['admin', 'officer']) && (int)$c['student_id'] !== $userId) {
                AuditService::log($userId, 'CONFIDENTIAL_ACCESS', 'complaint', (int)$c['id'], "Confidential grievance {$ref} viewed by {$role}");
            }
        }

        // Anonymity filter
        if ($c['is_anonymous'] && !in_array($role, ['admin', 'officer']) && (int)$c['student_id'] !== $userId) {
            $c['student_name'] = 'Anonymous Student';
            $c['student_email'] = 'anonymous@campuscare.edu';
            $c['roll_number'] = 'HIDDEN';
        }

        // Staff protection: Student cannot see investigating staff member identity (visible only to admin/officer)
        if ($role === 'student') {
            $c['assigned_to_name'] = null;
            $c['assigned_to_email'] = null;
            $c['assigned_to_user_id'] = null;
        }

        // Fetch comments (Internal notes hidden from students and auditors)
        $commentQuery = "
            SELECT cc.*, u.full_name as author_name, r.name as author_role
            FROM complaint_comments cc
            JOIN users u ON cc.user_id = u.id
            JOIN roles r ON u.role_id = r.id
            WHERE cc.complaint_id = ?
        ";
        if ($role === 'student' || $role === 'auditor') {
            $commentQuery .= " AND cc.is_internal = 0";
        }
        $commentQuery .= " ORDER BY cc.created_at ASC";

        $commStmt = $pdo->prepare($commentQuery);
        $commStmt->execute([$c['id']]);
        $c['comments'] = $commStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch status history
        $histStmt = $pdo->prepare("
            SELECT csh.*, u.full_name as changed_by_name, r.name as changed_by_role
            FROM complaint_status_history csh
            JOIN users u ON csh.changed_by_user_id = u.id
            JOIN roles r ON u.role_id = r.id
            WHERE csh.complaint_id = ?
            ORDER BY csh.created_at ASC
        ");
        $histStmt->execute([$c['id']]);
        $c['history'] = $histStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch attachments
        $attStmt = $pdo->prepare("
            SELECT id, file_name, file_size, file_type, created_at
            FROM complaint_attachments
            WHERE complaint_id = ?
            ORDER BY created_at ASC
        ");
        $attStmt->execute([$c['id']]);
        $c['attachments'] = $attStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch feedback if any
        $fbStmt = $pdo->prepare("SELECT * FROM complaint_feedback WHERE complaint_id = ? LIMIT 1");
        $fbStmt->execute([$c['id']]);
        $c['feedback'] = $fbStmt->fetch(PDO::FETCH_ASSOC) ?: null;

        return $c;
    }

    public static function updateStatus(string $ref, string $newStatus, ?string $reason, int $userId, string $role, ?string $resolutionSummary = null): array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM complaints WHERE reference_number = ? LIMIT 1");
        $stmt->execute([$ref]);
        $complaint = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$complaint) {
            throw new RuntimeException("Grievance not found.");
        }

        $oldStatus = $complaint['status'];

        // Validate allowed transitions
        $allowedTransitions = [
            'Submitted'    => ['Under Review', 'Rejected', 'Assigned'],
            'Under Review' => ['Assigned', 'In Progress', 'Rejected', 'Escalated'],
            'Assigned'     => ['In Progress', 'Escalated', 'Under Review'],
            'In Progress'  => ['Resolved', 'Escalated', 'Under Review'],
            'Resolved'     => ['Closed', 'Under Review', 'In Progress'], // reopen goes back to Under Review/In Progress
            'Closed'       => ['Under Review'], // Reopening
            'Escalated'    => ['In Progress', 'Resolved', 'Under Review'],
            'Rejected'     => ['Under Review']
        ];

        if (!in_array($newStatus, $allowedTransitions[$oldStatus] ?? [], true)) {
            throw new RuntimeException("Invalid status transition from '{$oldStatus}' to '{$newStatus}'.");
        }

        // Role authorization check for status update
        if ($role === 'auditor') {
            throw new RuntimeException("Access denied: Auditors hold strictly read-only permissions.");
        }
        if ($role === 'student') {
            throw new RuntimeException("Access denied: Students cannot change complaint status directly.");
        }
        if ($role === 'faculty') {
            if ((int)$complaint['assigned_to_user_id'] !== $userId) {
                throw new RuntimeException("Access denied: You can only update grievances assigned to your desk.");
            }
            if (!in_array($newStatus, ['In Progress', 'Resolved', 'Escalated'], true)) {
                throw new RuntimeException("Access denied: Faculty can only transition assigned cases to In Progress, Resolved, or Escalated.");
            }
        }
        if ($role === 'hod') {
            $userDeptStmt = $pdo->prepare("SELECT department_id FROM users WHERE id = ?");
            $userDeptStmt->execute([$userId]);
            $hodDept = (int)$userDeptStmt->fetchColumn();
            if ((int)$complaint['department_id'] !== $hodDept && (int)$complaint['assigned_to_dept_id'] !== $hodDept) {
                throw new RuntimeException("Access denied: Department Coordinators can only update complaints belonging to their department.");
            }
        }
        if ($newStatus === 'Closed' && !in_array($role, ['admin', 'officer'], true)) {
            throw new RuntimeException("Access denied: Only central Grievance Officers or Administrators can officially close cases.");
        }
        if ($newStatus === 'Rejected') {
            if (empty(trim($reason ?? ''))) {
                throw new RuntimeException("An authorized rejection reason is mandatory when rejecting a grievance.");
            }
            if (!in_array($role, ['admin', 'officer', 'hod'], true)) {
                throw new RuntimeException("Access denied: You do not have authority to reject complaints.");
            }
        }

        $resolvedAt = null;
        $closedAt = null;
        if ($newStatus === 'Resolved') {
            $resolvedAt = date('Y-m-d H:i:s');
        } elseif ($newStatus === 'Closed') {
            $closedAt = date('Y-m-d H:i:s');
        }

        $pdo->beginTransaction();
        try {
            $updateSql = "UPDATE complaints SET status = ?, updated_at = NOW()";
            $updateParams = [$newStatus];

            if ($resolvedAt) {
                $updateSql .= ", resolved_at = ?";
                $updateParams[] = $resolvedAt;
            }
            if ($closedAt) {
                $updateSql .= ", closed_at = ?";
                $updateParams[] = $closedAt;
            }
            if ($resolutionSummary !== null) {
                $updateSql .= ", resolution_summary = ?";
                $updateParams[] = $resolutionSummary;
            }

            $updateSql .= " WHERE id = ?";
            $updateParams[] = $complaint['id'];

            $updateStmt = $pdo->prepare($updateSql);
            $updateStmt->execute($updateParams);

            // Record history
            $histStmt = $pdo->prepare("
                INSERT INTO complaint_status_history (complaint_id, changed_by_user_id, old_status, new_status, reason, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            ");
            $histStmt->execute([$complaint['id'], $userId, $oldStatus, $newStatus, $reason ?: "Status updated to {$newStatus}"]);

            // Notify student
            NotificationService::send(
                (int)$complaint['student_id'],
                "Grievance Status Updated",
                "Your grievance [{$ref}] is now '{$newStatus}'.",
                "complaint-details.html?ref={$ref}",
                $newStatus === 'Resolved' ? 'success' : 'info'
            );

            // Audit
            AuditService::log($userId, 'STATUS_UPDATE', 'complaint', $complaint['id'], "Status changed from {$oldStatus} to {$newStatus}" . ($reason ? " Reason: {$reason}" : ""));

            $pdo->commit();
            return self::getByRef($ref, $userId, $role);
        } catch (\Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public static function assign(string $ref, ?int $assignedUserId, ?int $assignedDeptId, ?string $note, int $actingUserId, string $actingRole): array
    {
        if (!in_array($actingRole, ['admin', 'officer', 'hod'])) {
            throw new RuntimeException("Access denied: You do not have permission to assign complaints.");
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM complaints WHERE reference_number = ? LIMIT 1");
        $stmt->execute([$ref]);
        $complaint = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$complaint) {
            throw new RuntimeException("Grievance not found.");
        }

        // HOD department assignment isolation
        if ($actingRole === 'hod') {
            $deptCheck = $pdo->prepare("SELECT department_id FROM users WHERE id = ?");
            $deptCheck->execute([$actingUserId]);
            $hodDeptId = (int)$deptCheck->fetchColumn();

            if ((int)$complaint['department_id'] !== $hodDeptId && (int)$complaint['assigned_to_dept_id'] !== $hodDeptId) {
                throw new RuntimeException("Access denied: Department Coordinators can only assign complaints within their department.");
            }

            if ($assignedUserId) {
                $targetStaffDept = $pdo->prepare("SELECT department_id FROM users WHERE id = ?");
                $targetStaffDept->execute([$assignedUserId]);
                $staffDept = (int)$targetStaffDept->fetchColumn();
                if ($staffDept !== $hodDeptId) {
                    throw new RuntimeException("Access denied: Department Coordinators can only assign cases to staff within their own department.");
                }
            }
        }


        $pdo->beginTransaction();
        try {
            $updateStmt = $pdo->prepare("
                UPDATE complaints
                SET assigned_to_user_id = ?, assigned_to_dept_id = ?, status = 'Assigned', updated_at = NOW()
                WHERE id = ?
            ");
            $updateStmt->execute([$assignedUserId, $assignedDeptId, $complaint['id']]);

            // Assignment history entry
            $assignStmt = $pdo->prepare("
                INSERT INTO complaint_assignments (complaint_id, assigned_by_user_id, assigned_to_user_id, assigned_to_dept_id, note, assigned_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            ");
            $assignStmt->execute([$complaint['id'], $actingUserId, $assignedUserId, $assignedDeptId, $note]);

            // Status history
            $histStmt = $pdo->prepare("
                INSERT INTO complaint_status_history (complaint_id, changed_by_user_id, old_status, new_status, reason, created_at)
                VALUES (?, ?, ?, 'Assigned', ?, NOW())
            ");
            $histStmt->execute([$complaint['id'], $actingUserId, $complaint['status'], $note ?: "Assigned to staff/department"]);

            // Notify assigned user if specified
            if ($assignedUserId) {
                NotificationService::send(
                    $assignedUserId,
                    "New Grievance Assigned",
                    "You have been assigned to grievance [{$ref}] '{$complaint['title']}'.",
                    "complaint-details.html?ref={$ref}",
                    "warning"
                );
            }

            // Notify student
            NotificationService::send(
                (int)$complaint['student_id'],
                "Grievance Assigned",
                "Your grievance [{$ref}] has been assigned to an investigating officer/department.",
                "complaint-details.html?ref={$ref}",
                "info"
            );

            AuditService::log($actingUserId, 'COMPLAINT_ASSIGN', 'complaint', $complaint['id'], "Assigned to user {$assignedUserId}, dept {$assignedDeptId}");

            $pdo->commit();
            return self::getByRef($ref, $actingUserId, $actingRole);
        } catch (\Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public static function addComment(string $ref, string $commentText, bool $isInternal, int $userId, string $role): array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM complaints WHERE reference_number = ? LIMIT 1");
        $stmt->execute([$ref]);
        $complaint = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$complaint) {
            throw new RuntimeException("Grievance not found.");
        }

        if ($role === 'auditor') {
            throw new RuntimeException("Access denied: Auditors hold strictly read-only permissions.");
        }

        // Students can only post public comments to their own complaints
        if ($role === 'student') {
            if ((int)$complaint['student_id'] !== $userId) {
                throw new RuntimeException("Access denied: You cannot comment on this grievance.");
            }
            $isInternal = false;
        }

        // Only officers, HODs, admins can post internal notes
        if ($isInternal && !in_array($role, ['officer', 'hod', 'admin'])) {
            $isInternal = false;
        }

        $commStmt = $pdo->prepare("
            INSERT INTO complaint_comments (complaint_id, user_id, is_internal, comment_text, created_at)
            VALUES (?, ?, ?, ?, NOW())
        ");
        $commStmt->execute([$complaint['id'], $userId, $isInternal ? 1 : 0, $commentText]);

        // Send notification if not internal
        if (!$isInternal) {
            if ($role === 'student') {
                // Notify assigned officer
                if ($complaint['assigned_to_user_id']) {
                    NotificationService::send(
                        $complaint['assigned_to_user_id'],
                        "New Comment from Student",
                        "Student commented on grievance [{$ref}].",
                        "complaint-details.html?ref={$ref}",
                        "info"
                    );
                }
            } else {
                // Staff commented: notify student
                NotificationService::send(
                    (int)$complaint['student_id'],
                    "New Officer Response",
                    "An update was posted on your grievance [{$ref}].",
                    "complaint-details.html?ref={$ref}",
                    "info"
                );
            }
        }

        AuditService::log($userId, 'COMMENT_ADD', 'complaint', $complaint['id'], $isInternal ? "Internal note added" : "Public comment posted");
        return self::getByRef($ref, $userId, $role);
    }

    public static function submitFeedback(string $ref, int $rating, ?string $comments, bool $reopenRequested, ?string $reopenReason, int $studentId): array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM complaints WHERE reference_number = ? LIMIT 1");
        $stmt->execute([$ref]);
        $complaint = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$complaint) {
            throw new RuntimeException("Grievance not found.");
        }

        if ((int)$complaint['student_id'] !== $studentId) {
            throw new RuntimeException("Access denied: Only the reporting student can submit resolution feedback.");
        }

        if (!in_array($complaint['status'], ['Resolved', 'Closed'])) {
            throw new RuntimeException("Feedback can only be submitted for Resolved or Closed grievances.");
        }

        $pdo->beginTransaction();
        try {
            $fbStmt = $pdo->prepare("
                INSERT INTO complaint_feedback (complaint_id, student_id, rating, comments, reopen_requested, reopen_reason, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE rating=VALUES(rating), comments=VALUES(comments), reopen_requested=VALUES(reopen_requested), reopen_reason=VALUES(reopen_reason)
            ");
            $fbStmt->execute([$complaint['id'], $studentId, $rating, $comments, $reopenRequested ? 1 : 0, $reopenReason]);

            if ($reopenRequested) {
                // Update status to Under Review
                $upStmt = $pdo->prepare("UPDATE complaints SET status = 'Under Review', updated_at = NOW() WHERE id = ?");
                $upStmt->execute([$complaint['id']]);

                $histStmt = $pdo->prepare("
                    INSERT INTO complaint_status_history (complaint_id, changed_by_user_id, old_status, new_status, reason, created_at)
                    VALUES (?, ?, ?, 'Under Review', ?, NOW())
                ");
                $histStmt->execute([$complaint['id'], $studentId, $complaint['status'], "Student requested case reopening: " . $reopenReason]);

                // Notify officers
                $officerStmt = $pdo->query("SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.slug = 'officer'");
                foreach ($officerStmt->fetchAll(PDO::FETCH_COLUMN) as $oId) {
                    NotificationService::send(
                        $oId,
                        "Reopening Requested",
                        "Student requested reopening for [{$ref}]: {$reopenReason}",
                        "complaint-details.html?ref={$ref}",
                        "warning"
                    );
                }
            }

            AuditService::log($studentId, 'FEEDBACK_SUBMIT', 'complaint', $complaint['id'], "Feedback rating: {$rating}, Reopen: " . ($reopenRequested ? 'Yes' : 'No'));

            $pdo->commit();
            return self::getByRef($ref, $studentId, 'student');
        } catch (\Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public static function delete(string $ref, int $userId, string $role): bool
    {
        if ($role !== 'admin') {
            throw new RuntimeException("Access denied: Only system administrators can delete complaints.");
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT id FROM complaints WHERE reference_number = ? LIMIT 1");
        $stmt->execute([$ref]);
        $complaintId = $stmt->fetchColumn();

        if (!$complaintId) {
            throw new RuntimeException("Grievance not found.");
        }

        $delStmt = $pdo->prepare("DELETE FROM complaints WHERE id = ?");
        $delStmt->execute([$complaintId]);

        AuditService::log($userId, 'COMPLAINT_DELETE', 'complaint', $complaintId, "Grievance {$ref} deleted by admin");
        return true;
    }

    public static function getDashboardSummary(int $userId, string $role, ?int $deptId): array
    {
        $pdo = Database::getConnection();

        $where = ["1=1"];
        $params = [];

        if ($role === 'student') {
            $where[] = "c.student_id = ?";
            $params[] = $userId;
        } elseif ($role === 'faculty') {
            $where[] = "c.assigned_to_user_id = ? AND c.confidentiality_level != 'Confidential'";
            $params[] = $userId;
        } elseif ($role === 'hod') {
            $where[] = "(c.department_id = ? OR c.assigned_to_dept_id = ?) AND c.confidentiality_level != 'Confidential'";
            $params[] = $deptId;
            $params[] = $deptId;
        }

        $whereSql = implode(" AND ", $where);

        // Status counts
        $statusStmt = $pdo->prepare("
            SELECT c.status, COUNT(*) as count
            FROM complaints c
            WHERE {$whereSql}
            GROUP BY c.status
        ");
        $statusStmt->execute($params);
        $statusCounts = $statusStmt->fetchAll(PDO::FETCH_KEY_PAIR);

        $total = array_sum($statusCounts);
        $resolved = ($statusCounts['Resolved'] ?? 0) + ($statusCounts['Closed'] ?? 0);
        $pending = $total - $resolved;
        $inProgress = $statusCounts['In Progress'] ?? 0;

        // Overdue count
        $overdueStmt = $pdo->prepare("
            SELECT COUNT(*) FROM complaints c
            WHERE {$whereSql} AND c.due_date < NOW() AND c.status NOT IN ('Resolved', 'Closed', 'Rejected')
        ");
        $overdueStmt->execute($params);
        $overdueCount = (int) $overdueStmt->fetchColumn();

        // Priority breakdown
        $priStmt = $pdo->prepare("
            SELECT c.priority, COUNT(*) as count
            FROM complaints c
            WHERE {$whereSql}
            GROUP BY c.priority
        ");
        $priStmt->execute($params);
        $priorityCounts = $priStmt->fetchAll(PDO::FETCH_KEY_PAIR);

        // Recent 5 complaints
        $recentStmt = $pdo->prepare("
            SELECT c.reference_number, c.title, c.priority, c.status, c.created_at,
                   d.name as department_name, cat.name as category_name
            FROM complaints c
            JOIN departments d ON c.department_id = d.id
            JOIN categories cat ON c.category_id = cat.id
            WHERE {$whereSql}
            ORDER BY c.created_at DESC
            LIMIT 5
        ");
        $recentStmt->execute($params);
        $recentComplaints = $recentStmt->fetchAll(PDO::FETCH_ASSOC);

        // Department breakdown (for staff/admin/officers)
        $deptBreakdown = [];
        if (in_array($role, ['admin', 'officer', 'hod', 'auditor'])) {
            $deptStmt = $pdo->query("
                SELECT d.name, COUNT(c.id) as count
                FROM departments d
                LEFT JOIN complaints c ON d.id = c.department_id
                GROUP BY d.id, d.name
                ORDER BY count DESC
            ");
            $deptBreakdown = $deptStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        // --- Role-Specific Analytical & Operational Datasets ---
        $roleData = [];

        if ($role === 'student') {
            // Unrated resolved complaints for this student
            $unratedStmt = $pdo->prepare("
                SELECT c.reference_number, c.title, c.resolved_at, cat.name as category_name
                FROM complaints c
                JOIN categories cat ON c.category_id = cat.id
                WHERE c.student_id = ? AND c.status = 'Resolved'
                  AND c.id NOT IN (SELECT complaint_id FROM complaint_feedback WHERE student_id = ?)
                ORDER BY c.resolved_at DESC
                LIMIT 3
            ");
            $unratedStmt->execute([$userId, $userId]);
            $roleData['pending_ratings'] = $unratedStmt->fetchAll(PDO::FETCH_ASSOC);
        } elseif ($role === 'faculty') {
            // Assigned active cases queue
            $assignedStmt = $pdo->prepare("
                SELECT c.reference_number, c.title, c.priority, c.status, c.due_date, c.created_at,
                       c.confidentiality_level, cat.name as category_name,
                       CASE WHEN c.confidentiality_level = 'Anonymous' THEN 'Anonymous Student' ELSE u.full_name END as student_name
                FROM complaints c
                JOIN categories cat ON c.category_id = cat.id
                JOIN users u ON c.student_id = u.id
                WHERE c.assigned_to_user_id = ? AND c.confidentiality_level != 'Confidential'
                  AND c.status NOT IN ('Closed', 'Rejected')
                ORDER BY CASE WHEN c.status = 'In Progress' THEN 1 WHEN c.status = 'Assigned' THEN 2 ELSE 3 END,
                         CASE WHEN c.due_date < NOW() THEN 0 ELSE 1 END,
                         c.due_date ASC
                LIMIT 10
            ");
            $assignedStmt->execute([$userId]);
            $roleData['assigned_queue'] = $assignedStmt->fetchAll(PDO::FETCH_ASSOC);
        } elseif ($role === 'hod') {
            // Department unassigned cases queue
            $unassignedStmt = $pdo->prepare("
                SELECT c.reference_number, c.title, c.priority, c.status, c.created_at, c.due_date,
                       cat.name as category_name,
                       CASE WHEN c.confidentiality_level = 'Anonymous' THEN 'Anonymous Student' ELSE u.full_name END as student_name
                FROM complaints c
                JOIN categories cat ON c.category_id = cat.id
                JOIN users u ON c.student_id = u.id
                WHERE (c.department_id = ? OR c.assigned_to_dept_id = ?)
                  AND c.assigned_to_user_id IS NULL
                  AND c.confidentiality_level != 'Confidential'
                  AND c.status NOT IN ('Resolved', 'Closed', 'Rejected')
                ORDER BY c.created_at DESC
                LIMIT 10
            ");
            $unassignedStmt->execute([$deptId, $deptId]);
            $roleData['unassigned_queue'] = $unassignedStmt->fetchAll(PDO::FETCH_ASSOC);

            // Department faculty workload list
            $deptFacultyStmt = $pdo->prepare("
                SELECT u.id, u.full_name, u.email,
                       (SELECT COUNT(*) FROM complaints c WHERE c.assigned_to_user_id = u.id AND c.status IN ('Assigned', 'In Progress')) as active_cases,
                       (SELECT COUNT(*) FROM complaints c WHERE c.assigned_to_user_id = u.id AND c.status = 'Resolved') as resolved_cases
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE r.slug = 'faculty' AND u.department_id = ? AND u.is_active = 1
                ORDER BY active_cases ASC, u.full_name ASC
            ");
            $deptFacultyStmt->execute([$deptId]);
            $roleData['department_faculty'] = $deptFacultyStmt->fetchAll(PDO::FETCH_ASSOC);
        } elseif ($role === 'officer') {
            // Escalated cases queue
            $escStmt = $pdo->query("
                SELECT c.reference_number, c.title, c.priority, c.status, c.updated_at, c.due_date,
                       d.name as department_name, cat.name as category_name,
                       u.full_name as student_name, fa.full_name as faculty_name
                FROM complaints c
                JOIN categories cat ON c.category_id = cat.id
                JOIN departments d ON c.department_id = d.id
                JOIN users u ON c.student_id = u.id
                LEFT JOIN users fa ON c.assigned_to_user_id = fa.id
                WHERE c.status = 'Escalated'
                ORDER BY c.updated_at DESC
                LIMIT 10
            ");
            $roleData['escalated_queue'] = $escStmt->fetchAll(PDO::FETCH_ASSOC);

            // Authorized Confidential cases
            $confStmt = $pdo->query("
                SELECT c.reference_number, c.title, c.priority, c.status, c.created_at, c.due_date,
                       d.name as department_name, cat.name as category_name
                FROM complaints c
                JOIN categories cat ON c.category_id = cat.id
                JOIN departments d ON c.department_id = d.id
                WHERE c.confidentiality_level = 'Confidential'
                  AND c.status NOT IN ('Closed', 'Rejected')
                ORDER BY c.created_at DESC
                LIMIT 8
            ");
            $roleData['confidential_queue'] = $confStmt->fetchAll(PDO::FETCH_ASSOC);

            // Pending closure cases (Resolved cases awaiting grievance office verification)
            $closureStmt = $pdo->query("
                SELECT c.reference_number, c.title, c.priority, c.resolved_at, c.resolution_summary,
                       d.name as department_name, cat.name as category_name, fa.full_name as resolver_name
                FROM complaints c
                JOIN categories cat ON c.category_id = cat.id
                JOIN departments d ON c.department_id = d.id
                LEFT JOIN users fa ON c.assigned_to_user_id = fa.id
                WHERE c.status = 'Resolved'
                ORDER BY c.resolved_at DESC
                LIMIT 8
            ");
            $roleData['pending_closure_queue'] = $closureStmt->fetchAll(PDO::FETCH_ASSOC);
        } elseif ($role === 'admin') {
            // User counts by role
            $userCountsStmt = $pdo->query("
                SELECT r.name as role_name, r.slug as role_slug, COUNT(u.id) as user_count
                FROM roles r
                LEFT JOIN users u ON r.id = u.role_id AND u.is_active = 1
                GROUP BY r.id, r.name, r.slug
                ORDER BY r.id ASC
            ");
            $roleData['user_roles_breakdown'] = $userCountsStmt->fetchAll(PDO::FETCH_ASSOC);

            // Recent security audit events
            $auditStmt = $pdo->query("
                SELECT a.id, a.user_id, a.action, a.entity_type, a.entity_id, a.details, a.ip_address, a.created_at,
                       COALESCE(u.username, 'System') as username, COALESCE(u.full_name, 'Automated System') as full_name
                FROM audit_logs a
                LEFT JOIN users u ON a.user_id = u.id
                ORDER BY a.created_at DESC
                LIMIT 8
            ");
            $roleData['recent_security_events'] = $auditStmt->fetchAll(PDO::FETCH_ASSOC);

            // Total counts
            $roleData['system_counts'] = [
                'total_users'       => (int) $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn(),
                'active_users'      => (int) $pdo->query("SELECT COUNT(*) FROM users WHERE is_active = 1")->fetchColumn(),
                'total_departments' => (int) $pdo->query("SELECT COUNT(*) FROM departments")->fetchColumn(),
                'total_categories'  => (int) $pdo->query("SELECT COUNT(*) FROM categories")->fetchColumn(),
                'total_audits'      => (int) $pdo->query("SELECT COUNT(*) FROM audit_logs")->fetchColumn(),
            ];
        } elseif ($role === 'auditor') {
            // SLA Compliance summary
            $auditedCount = (int) $pdo->query("SELECT COUNT(*) FROM complaints")->fetchColumn();
            $onTimeCount = (int) $pdo->query("
                SELECT COUNT(*) FROM complaints 
                WHERE status IN ('Resolved', 'Closed') AND (resolved_at <= due_date OR due_date IS NULL)
            ")->fetchColumn();
            $breachCount = (int) $pdo->query("
                SELECT COUNT(*) FROM complaints 
                WHERE (due_date < NOW() AND status NOT IN ('Resolved', 'Closed', 'Rejected')) 
                   OR (resolved_at > due_date)
            ")->fetchColumn();

            $compliancePct = $auditedCount > 0 ? (int) round(($onTimeCount / max(1, $onTimeCount + $breachCount)) * 100) : 100;

            $roleData['compliance_summary'] = [
                'total_audited'      => $auditedCount,
                'on_time_count'      => $onTimeCount,
                'sla_breaches'       => $breachCount,
                'compliance_pct'     => $compliancePct,
                'total_audit_events' => (int) $pdo->query("SELECT COUNT(*) FROM audit_logs")->fetchColumn()
            ];

            // Recent audit trail entries
            $auditTrailStmt = $pdo->query("
                SELECT a.id, a.user_id, a.action, a.entity_type, a.entity_id, a.details, a.ip_address, a.created_at,
                       COALESCE(u.username, 'System') as username, COALESCE(u.full_name, 'Automated') as full_name
                FROM audit_logs a
                LEFT JOIN users u ON a.user_id = u.id
                ORDER BY a.created_at DESC
                LIMIT 10
            ");
            $roleData['recent_audit_trail'] = $auditTrailStmt->fetchAll(PDO::FETCH_ASSOC);

            // Category compliance performance
            $catPerfStmt = $pdo->query("
                SELECT cat.name, cat.sla_days, COUNT(c.id) as total_complaints,
                       SUM(CASE WHEN c.status IN ('Resolved', 'Closed') AND (c.resolved_at <= c.due_date OR c.due_date IS NULL) THEN 1 ELSE 0 END) as on_time,
                       SUM(CASE WHEN c.due_date < NOW() AND c.status NOT IN ('Resolved', 'Closed', 'Rejected') THEN 1 ELSE 0 END) as overdue_breaches
                FROM categories cat
                LEFT JOIN complaints c ON cat.id = c.category_id
                GROUP BY cat.id, cat.name, cat.sla_days
                ORDER BY total_complaints DESC
            ");
            $roleData['category_compliance'] = $catPerfStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        return [
            'metrics' => [
                'total'       => $total,
                'pending'     => $pending,
                'in_progress' => $inProgress,
                'resolved'    => $resolved,
                'overdue'     => $overdueCount
            ],
            'status_distribution'   => $statusCounts,
            'priority_distribution' => $priorityCounts,
            'recent_complaints'     => $recentComplaints,
            'department_breakdown'  => $deptBreakdown,
            'role_data'             => $roleData
        ];
    }
}
