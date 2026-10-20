# CampusCare — Database Design & Data Dictionary

## Overview
- **Database Name**: `campuscare_db`
- **Engine**: InnoDB
- **Charset & Collation**: `utf8mb4` / `utf8mb4_unicode_ci`

## Entity Relationship Overview
- `departments` 1:N `users`
- `roles` 1:N `users`
- `roles` M:N `permissions` (via `role_permissions`)
- `departments` 1:N `categories`
- `users` (student) 1:N `complaints`
- `departments` 1:N `complaints`
- `categories` 1:N `complaints`
- `complaints` 1:N `complaint_assignments`
- `complaints` 1:N `complaint_comments`
- `complaints` 1:N `complaint_status_history`
- `complaints` 1:N `complaint_attachments`
- `complaints` 1:1 `complaint_feedback`
- `users` 1:N `notifications`
- `users` 1:N `audit_logs`

## Tables & Schemas

### 1. `departments`
- `id`: INT UNSIGNED AUTO_INCREMENT PK
- `code`: VARCHAR(20) UNIQUE (e.g. CSE, ECE, HOSTEL, ADMIN)
- `name`: VARCHAR(100) NOT NULL
- `description`: TEXT NULL

### 2. `roles`
- `id`: INT UNSIGNED AUTO_INCREMENT PK
- `name`: VARCHAR(50) NOT NULL
- `slug`: VARCHAR(50) UNIQUE (student, faculty, hod, officer, admin, auditor)
- `description`: VARCHAR(255)

### 3. `permissions` & `role_permissions`
- Standard RBAC lookup table linking role IDs to atomic permissions (`complaints.create`, `complaints.assign`, etc.).

### 4. `categories`
- `id`: INT UNSIGNED AUTO_INCREMENT PK
- `name`: VARCHAR(100) UNIQUE
- `slug`: VARCHAR(100) UNIQUE
- `department_id`: INT UNSIGNED NULL (FK to departments)
- `sla_days`: INT UNSIGNED DEFAULT 5 (Resolution deadline in working days)
- `is_active`: TINYINT(1) DEFAULT 1

### 5. `users`
- `id`: INT UNSIGNED AUTO_INCREMENT PK
- `username`: VARCHAR(60) UNIQUE
- `email`: VARCHAR(120) UNIQUE
- `password_hash`: VARCHAR(255) (Bcrypt hash)
- `full_name`: VARCHAR(120)
- `phone`: VARCHAR(20) NULL
- `role_id`: INT UNSIGNED (FK to roles)
- `department_id`: INT UNSIGNED NULL (FK to departments)
- `roll_number`: VARCHAR(50) NULL
- `is_active`: TINYINT(1) DEFAULT 1
- `failed_logins`: INT UNSIGNED DEFAULT 0
- `lock_until`: DATETIME NULL

### 6. `complaints`
- `id`: INT UNSIGNED AUTO_INCREMENT PK
- `reference_number`: VARCHAR(30) UNIQUE (Format: `CC-YYYY-XXXXX`)
- `student_id`: INT UNSIGNED (FK to users)
- `department_id`: INT UNSIGNED (FK to departments)
- `category_id`: INT UNSIGNED (FK to categories)
- `subcategory`: VARCHAR(100) NULL
- `title`: VARCHAR(200) NOT NULL
- `description`: TEXT NOT NULL
- `priority`: ENUM('Low', 'Medium', 'High', 'Urgent')
- `confidentiality_level`: ENUM('Standard', 'Confidential', 'Anonymous')
- `is_anonymous`: TINYINT(1) DEFAULT 0
- `status`: ENUM('Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Escalated', 'Rejected')
- `assigned_to_user_id`: INT UNSIGNED NULL (FK to users)
- `assigned_to_dept_id`: INT UNSIGNED NULL (FK to departments)
- `due_date`: DATETIME
- `resolution_summary`: TEXT NULL
- `resolved_at`: DATETIME NULL
- `closed_at`: DATETIME NULL

### 7. Auxiliary Lifecycle Tables
- `complaint_assignments`: Assignment notes, delegating officer, target faculty.
- `complaint_comments`: Discussion feed with `is_internal` flag for officer-only notes.
- `complaint_status_history`: Immutable transition log with reasons.
- `complaint_attachments`: Storage path, file size, verified MIME types.
- `complaint_feedback`: Rating (1-5), comments, and reopening request details.
- `notifications`: User alert notifications with read flags and direct link.
- `audit_logs`: System-wide security trail with IP addresses and user agents.
