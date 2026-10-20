<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Services\ComplaintService;
use App\Helpers\Response;
use App\Helpers\FileUpload;
use App\Helpers\Session;
use App\Config\Database;
use App\Validators\Validator;
use Exception;
use PDO;

class ComplaintController extends Controller
{
    public function index(): void
    {
        $userId = $this->getUserId();
        $role = $this->getUserRole();
        $deptId = $this->getUserDeptId();

        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? min(100, max(5, (int)$_GET['per_page'])) : 15;

        $filters = [
            'status'        => $_GET['status'] ?? null,
            'category_id'   => $_GET['category_id'] ?? null,
            'priority'      => $_GET['priority'] ?? null,
            'department_id' => $_GET['department_id'] ?? null,
            'search'        => $_GET['search'] ?? null,
        ];

        try {
            $result = ComplaintService::listComplaints($filters, $userId, $role, $deptId, $page, $perPage);
            Response::success($result);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    public function store(): void
    {
        $userId = $this->getUserId();
        $role = $this->getUserRole();

        if ($role !== 'student' && $role !== 'admin') {
            Response::forbidden('Only registered students or administrators can submit grievances.');
            return;
        }

        $input = $this->getJsonInput();

        $validator = Validator::make($input, [
            'title'       => 'required|min:5|max:200',
            'description' => 'required|min:15',
            'category_id' => 'required|integer',
            'priority'    => 'in:Low,Medium,High,Urgent'
        ]);

        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }

        // Handle optional file upload
        $attachment = null;
        if (!empty($_FILES['attachment']) && $_FILES['attachment']['error'] !== UPLOAD_ERR_NO_FILE) {
            try {
                $attachment = FileUpload::process($_FILES['attachment']);
            } catch (Exception $e) {
                Response::error("Attachment error: " . $e->getMessage(), 422);
                return;
            }
        }
        $input['attachment'] = $attachment;

        try {
            $complaint = ComplaintService::create($input, $userId);
            Response::success($complaint, 'Grievance submitted successfully with reference ' . $complaint['reference_number'], 201);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    public function show(string $ref): void
    {
        $userId = $this->getUserId();
        $role = $this->getUserRole();
        $deptId = $this->getUserDeptId();

        try {
            $complaint = ComplaintService::getByRef($ref, $userId, $role, $deptId);
            Response::success($complaint);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 404);
        }
    }

    public function updateStatus(string $ref): void
    {
        $userId = $this->getUserId();
        $role = $this->getUserRole();
        $input = $this->getJsonInput();

        $validator = Validator::make($input, [
            'status' => 'required|in:Submitted,Under Review,Assigned,In Progress,Resolved,Closed,Escalated,Rejected'
        ]);

        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }

        try {
            $updated = ComplaintService::updateStatus(
                $ref,
                $input['status'],
                $input['reason'] ?? null,
                $userId,
                $role,
                $input['resolution_summary'] ?? null
            );
            Response::success($updated, 'Status updated successfully');
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    public function assign(string $ref): void
    {
        $userId = $this->getUserId();
        $role = $this->getUserRole();
        $input = $this->getJsonInput();

        try {
            $assignedUserId = !empty($input['assigned_to_user_id']) ? (int)$input['assigned_to_user_id'] : null;
            $assignedDeptId = !empty($input['assigned_to_dept_id']) ? (int)$input['assigned_to_dept_id'] : null;

            $updated = ComplaintService::assign(
                $ref,
                $assignedUserId,
                $assignedDeptId,
                $input['note'] ?? null,
                $userId,
                $role
            );
            Response::success($updated, 'Grievance assignment updated');
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    public function addComment(string $ref): void
    {
        $userId = $this->getUserId();
        $role = $this->getUserRole();
        $input = $this->getJsonInput();

        $validator = Validator::make($input, [
            'comment' => 'required|min:2'
        ]);

        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }

        $isInternal = !empty($input['is_internal']);

        try {
            $updated = ComplaintService::addComment($ref, $input['comment'], $isInternal, $userId, $role);
            Response::success($updated, 'Comment posted successfully');
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    public function submitFeedback(string $ref): void
    {
        $userId = $this->getUserId();
        $input = $this->getJsonInput();

        $validator = Validator::make($input, [
            'rating' => 'required|integer|in:1,2,3,4,5'
        ]);

        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }

        $reopenRequested = !empty($input['reopen_requested']);
        $reopenReason = $input['reopen_reason'] ?? null;

        try {
            $updated = ComplaintService::submitFeedback(
                $ref,
                (int)$input['rating'],
                $input['comments'] ?? null,
                $reopenRequested,
                $reopenReason,
                $userId
            );
            Response::success($updated, 'Feedback recorded successfully');
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    public function delete(string $ref): void
    {
        $userId = $this->getUserId();
        $role = $this->getUserRole();

        try {
            ComplaintService::delete($ref, $userId, $role);
            Response::success(null, "Grievance {$ref} deleted successfully");
        } catch (Exception $e) {
            Response::error($e->getMessage(), 403);
        }
    }

    public function summary(): void
    {
        $userId = $this->getUserId();
        $role = $this->getUserRole();
        $deptId = $this->getUserDeptId();

        try {
            $data = ComplaintService::getDashboardSummary($userId, $role, $deptId);
            Response::success($data);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    public function downloadAttachment(string $id): void
    {
        $userId = $this->getUserId();
        $role = $this->getUserRole();

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            SELECT a.*, c.student_id, c.confidentiality_level, c.department_id, c.assigned_to_user_id
            FROM complaint_attachments a
            JOIN complaints c ON a.complaint_id = c.id
            WHERE a.id = ?
            LIMIT 1
        ");
        $stmt->execute([(int)$id]);
        $att = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$att) {
            Response::notFound('Attachment not found.');
            return;
        }

        // Authorization check
        if ($role === 'student' && (int)$att['student_id'] !== $userId) {
            Response::forbidden('Access denied.');
            return;
        }
        if ($att['confidentiality_level'] === 'Confidential' && !in_array($role, ['admin', 'officer']) && (int)$att['student_id'] !== $userId) {
            Response::forbidden('Access denied to confidential document.');
            return;
        }

        $filePath = dirname(__DIR__, 2) . '/' . $att['file_path'];
        if (!file_exists($filePath)) {
            Response::notFound('File missing on server.');
            return;
        }

        header('Content-Type: ' . $att['file_type']);
        header('Content-Disposition: attachment; filename="' . $att['file_name'] . '"');
        header('Content-Length: ' . filesize($filePath));
        header('Cache-Control: private, max-age=0, must-revalidate');
        readfile($filePath);
        exit;
    }
}
