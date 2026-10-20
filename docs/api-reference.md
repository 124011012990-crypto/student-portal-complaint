# CampusCare — REST API Reference

All requests and responses use JSON format (`Content-Type: application/json`) unless handling multipart file uploads (`FormData`).

## Authentication & User Session

### `POST /api/auth/login`
Authenticates a user and starts a secure PHP session.
- **Body**: `{ "username": "student_arun", "password": "Password@123" }`
- **Response**: `{ "success": true, "data": { ...userObject, "csrf_token": "..." } }`

### `POST /api/auth/logout`
Destroys the session and logs the audit event.

### `GET /api/auth/me`
Returns the currently authenticated user with roles and permissions.

### `GET /api/auth/csrf`
Retrieves a valid CSRF security token.

### `POST /api/auth/change-password`
- **Body**: `{ "current_password": "...", "new_password": "..." }`

---

## Complaints & Grievances

### `GET /api/complaints`
Returns paginated list of grievances scoped by user role.
- **Query Params**: `page`, `per_page`, `status`, `category_id`, `priority`, `department_id`, `search`

### `POST /api/complaints`
Submits a new grievance. Accepts JSON or multipart `FormData`.
- **Fields**: `title`, `description`, `category_id`, `department_id`, `priority`, `confidentiality_level`, `attachment`

### `GET /api/complaints/{ref}`
Returns full details, comments, attachments, and timeline history.

### `POST /api/complaints/{ref}/update`
Updates status.
- **Body**: `{ "status": "In Progress", "reason": "...", "resolution_summary": "..." }`

### `POST /api/complaints/{ref}/assign`
Assigns staff member or department.
- **Body**: `{ "assigned_to_user_id": 4, "assigned_to_dept_id": 1, "note": "..." }`

### `POST /api/complaints/{ref}/comments`
Posts a comment or officer internal note.
- **Body**: `{ "comment": "...", "is_internal": false }`

### `POST /api/complaints/{ref}/feedback`
Student satisfaction feedback.
- **Body**: `{ "rating": 5, "comments": "...", "reopen_requested": false }`

### `POST /api/complaints/{ref}/delete`
Admin deletion with CSRF token.

---

## Analytics, Reports & Logs

### `GET /api/dashboard/summary`
Returns metric counts, priority breakdown, and recent complaints.

### `GET /api/reports/summary`
Returns department distribution, category volume, average resolution time, and monthly trend.

### `GET /api/reports/export`
Generates and downloads a formula-injection-safe CSV export.

### `GET /api/audit-logs`
Returns chronological audit trail for administrative inspection.
