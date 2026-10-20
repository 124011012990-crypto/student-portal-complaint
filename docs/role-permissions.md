# CampusCare — Role-Based Access Control (RBAC) Specification

## 1. Role Definitions

### Student (`student`)
- Allowed to submit new grievances with optional supporting documents.
- Can track and view only their own grievances.
- Can post public comments and queries to investigating staff.
- Can submit a 1-5 satisfaction rating and request case reopening if a resolution was unsatisfactory.

### Faculty / Staff (`faculty`)
- Can view only complaints explicitly assigned to them or within authorized department scope.
- Cannot view confidential grievances without explicit assignment.
- Can advance workflow status of assigned cases from `Assigned` to `In Progress` and `Resolved`.
- Can post public updates and instructions for the student.

### Department Coordinator / HOD (`hod`)
- Oversees grievances within their department.
- Can assign departmental grievances to faculty and technicians.
- Can post internal notes visible only to staff.
- Can advance case status or escalate overdue cases.
- Accesses department summary analytics.

### Grievance Officer (`officer`)
- Central investigative authority.
- Can view all standard and confidential grievances college-wide.
- Directly reassigns, escalates, updates status, and enters official resolution summaries.
- Can record internal notes hidden from students.

### System Administrator (`admin`)
- Full administrative access over accounts, roles, departments, categories, and system parameters.
- Has explicit deletion authority over complaints with confirmation and audit tracking.
- Subject to immutable audit logging for all critical operations.

### Quality Auditor (`auditor`)
- Strictly read-only compliance reviewer.
- Accesses summary reports, resolution turnarounds, and audit logs.
- Cannot view restricted confidential cases or edit complaints.

## 2. Server-Side Enforcement Rules
1. Every API endpoint enforces RBAC through `AuthMiddleware` and `RoleMiddleware`.
2. Frontend buttons or hidden navigation links are never relied upon for security.
3. Record ownership (`student_id === current_user_id`) is checked authoritatively for all student operations.
4. Anonymity is enforced by stripping identifying fields on the server before transmitting JSON responses to non-admin/officer users.
