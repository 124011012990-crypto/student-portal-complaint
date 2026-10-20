-- CampusCare Master Database Schema
-- Database: campuscare_db

CREATE DATABASE IF NOT EXISTS `campuscare_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `campuscare_db`;

-- 1. Departments
CREATE TABLE IF NOT EXISTS `departments` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(20) NOT NULL UNIQUE,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_dept_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Roles
CREATE TABLE IF NOT EXISTS `roles` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL,
    `slug` VARCHAR(50) NOT NULL UNIQUE,
    `description` VARCHAR(255) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_role_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Permissions
CREATE TABLE IF NOT EXISTS `permissions` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(100) NOT NULL UNIQUE,
    `module` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_perm_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Role Permissions
CREATE TABLE IF NOT EXISTS `role_permissions` (
    `role_id` INT UNSIGNED NOT NULL,
    `permission_id` INT UNSIGNED NOT NULL,
    PRIMARY KEY (`role_id`, `permission_id`),
    CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_rp_perm` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Categories
CREATE TABLE IF NOT EXISTS `categories` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `slug` VARCHAR(100) NOT NULL UNIQUE,
    `description` TEXT NULL,
    `department_id` INT UNSIGNED NULL,
    `sla_days` INT UNSIGNED NOT NULL DEFAULT 5,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_cat_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
    INDEX `idx_cat_dept` (`department_id`),
    INDEX `idx_cat_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Users
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(60) NOT NULL UNIQUE,
    `email` VARCHAR(120) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(120) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `role_id` INT UNSIGNED NOT NULL,
    `department_id` INT UNSIGNED NULL,
    `roll_number` VARCHAR(50) NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `failed_logins` INT UNSIGNED NOT NULL DEFAULT 0,
    `lock_until` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_users_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
    INDEX `idx_user_email` (`email`),
    INDEX `idx_user_role` (`role_id`),
    INDEX `idx_user_dept` (`department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Complaints
CREATE TABLE IF NOT EXISTS `complaints` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `reference_number` VARCHAR(30) NOT NULL UNIQUE,
    `student_id` INT UNSIGNED NOT NULL,
    `department_id` INT UNSIGNED NOT NULL,
    `category_id` INT UNSIGNED NOT NULL,
    `subcategory` VARCHAR(100) NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NOT NULL,
    `priority` ENUM('Low', 'Medium', 'High', 'Urgent') NOT NULL DEFAULT 'Medium',
    `confidentiality_level` ENUM('Standard', 'Confidential', 'Anonymous') NOT NULL DEFAULT 'Standard',
    `is_anonymous` TINYINT(1) NOT NULL DEFAULT 0,
    `status` ENUM('Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Escalated', 'Rejected') NOT NULL DEFAULT 'Submitted',
    `assigned_to_user_id` INT UNSIGNED NULL,
    `assigned_to_dept_id` INT UNSIGNED NULL,
    `due_date` DATETIME NULL,
    `resolution_summary` TEXT NULL,
    `resolved_at` DATETIME NULL,
    `closed_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_complaint_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_complaint_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_complaint_cat` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_complaint_assigned_user` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_complaint_assigned_dept` FOREIGN KEY (`assigned_to_dept_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
    INDEX `idx_complaint_ref` (`reference_number`),
    INDEX `idx_complaint_student` (`student_id`),
    INDEX `idx_complaint_dept` (`department_id`),
    INDEX `idx_complaint_cat` (`category_id`),
    INDEX `idx_complaint_status` (`status`),
    INDEX `idx_complaint_priority` (`priority`),
    INDEX `idx_complaint_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Complaint Assignments History
CREATE TABLE IF NOT EXISTS `complaint_assignments` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `complaint_id` INT UNSIGNED NOT NULL,
    `assigned_by_user_id` INT UNSIGNED NOT NULL,
    `assigned_to_user_id` INT UNSIGNED NULL,
    `assigned_to_dept_id` INT UNSIGNED NULL,
    `note` TEXT NULL,
    `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_ca_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ca_by_user` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ca_to_user` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_ca_to_dept` FOREIGN KEY (`assigned_to_dept_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
    INDEX `idx_ca_complaint` (`complaint_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Complaint Comments
CREATE TABLE IF NOT EXISTS `complaint_comments` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `complaint_id` INT UNSIGNED NOT NULL,
    `user_id` INT UNSIGNED NOT NULL,
    `is_internal` TINYINT(1) NOT NULL DEFAULT 0,
    `comment_text` TEXT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_cc_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_cc_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    INDEX `idx_cc_complaint` (`complaint_id`),
    INDEX `idx_cc_internal` (`is_internal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Complaint Status History
CREATE TABLE IF NOT EXISTS `complaint_status_history` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `complaint_id` INT UNSIGNED NOT NULL,
    `changed_by_user_id` INT UNSIGNED NOT NULL,
    `old_status` VARCHAR(50) NOT NULL,
    `new_status` VARCHAR(50) NOT NULL,
    `reason` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_csh_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_csh_user` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    INDEX `idx_csh_complaint` (`complaint_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Complaint Attachments
CREATE TABLE IF NOT EXISTS `complaint_attachments` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `complaint_id` INT UNSIGNED NOT NULL,
    `uploaded_by_user_id` INT UNSIGNED NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `stored_file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(255) NOT NULL,
    `file_size` INT UNSIGNED NOT NULL,
    `file_type` VARCHAR(100) NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_attach_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_attach_user` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    INDEX `idx_attach_complaint` (`complaint_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Complaint Feedback & Reopening
CREATE TABLE IF NOT EXISTS `complaint_feedback` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `complaint_id` INT UNSIGNED NOT NULL,
    `student_id` INT UNSIGNED NOT NULL,
    `rating` TINYINT UNSIGNED NOT NULL CHECK (`rating` BETWEEN 1 AND 5),
    `comments` TEXT NULL,
    `reopen_requested` TINYINT(1) NOT NULL DEFAULT 0,
    `reopen_reason` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_fb_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_fb_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    INDEX `idx_fb_complaint` (`complaint_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Notifications
CREATE TABLE IF NOT EXISTS `notifications` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `message` TEXT NOT NULL,
    `link` VARCHAR(255) NULL,
    `type` VARCHAR(50) NOT NULL DEFAULT 'info',
    `is_read` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    INDEX `idx_notif_user` (`user_id`, `is_read`),
    INDEX `idx_notif_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Audit Logs
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity_type` VARCHAR(50) NOT NULL,
    `entity_id` INT UNSIGNED NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(255) NULL,
    `details` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    INDEX `idx_audit_user` (`user_id`),
    INDEX `idx_audit_action` (`action`),
    INDEX `idx_audit_entity` (`entity_type`, `entity_id`),
    INDEX `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Student Registry (Controlled institutional directory for verified student activation)
CREATE TABLE IF NOT EXISTS `student_registry` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `roll_number` VARCHAR(50) NOT NULL UNIQUE,
    `email` VARCHAR(120) NOT NULL UNIQUE,
    `full_name` VARCHAR(120) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `department_id` INT UNSIGNED NULL,
    `is_activated` TINYINT(1) NOT NULL DEFAULT 0,
    `activation_token_hash` VARCHAR(255) NULL,
    `otp_code_hash` VARCHAR(255) NULL,
    `otp_expires_at` DATETIME NULL,
    `activated_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_sr_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
    INDEX `idx_sr_roll` (`roll_number`),
    INDEX `idx_sr_email` (`email`),
    INDEX `idx_sr_activated` (`is_activated`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Password Resets (Time-limited, single-use, hashed token password reset records)
CREATE TABLE IF NOT EXISTS `password_resets` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(120) NOT NULL,
    `token_hash` VARCHAR(255) NOT NULL,
    `otp_code_hash` VARCHAR(255) NULL,
    `expires_at` DATETIME NOT NULL,
    `used_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_pr_email` (`email`),
    INDEX `idx_pr_token` (`token_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. User Persistent Tokens (Secure cryptographic selector/validator tokens for remember-me)
CREATE TABLE IF NOT EXISTS `user_tokens` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED NOT NULL,
    `selector` VARCHAR(64) NOT NULL UNIQUE,
    `token_hash` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_ut_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    INDEX `idx_ut_selector` (`selector`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

