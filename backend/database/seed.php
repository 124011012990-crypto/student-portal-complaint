<?php

require_once __DIR__ . '/../app/Config/Config.php';
require_once __DIR__ . '/../app/Config/Database.php';

use App\Config\Config;
use App\Config\Database;

Config::load(__DIR__ . '/../.env');

echo "=== CampusCare Database Seeder ===\n";

try {
    $pdo = Database::getConnection();

    // 1. Roles
    $roles = [
        ['name' => 'Student', 'slug' => 'student', 'description' => 'College student submitting and tracking grievances'],
        ['name' => 'Faculty / Staff', 'slug' => 'faculty', 'description' => 'Academic faculty or staff handling assigned complaints'],
        ['name' => 'Department Coordinator / HOD', 'slug' => 'hod', 'description' => 'Department Head overseeing department cases'],
        ['name' => 'Grievance Officer', 'slug' => 'officer', 'description' => 'Central grievance redressal officer investigating cases'],
        ['name' => 'System Administrator', 'slug' => 'admin', 'description' => 'Portal administrator managing users, roles, and settings'],
        ['name' => 'Auditor', 'slug' => 'auditor', 'description' => 'Independent compliance and audit reviewer']
    ];

    $stmtRole = $pdo->prepare("INSERT INTO roles (name, slug, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description)");
    foreach ($roles as $r) {
        $stmtRole->execute([$r['name'], $r['slug'], $r['description']]);
    }
    echo "Seeded " . count($roles) . " roles.\n";

    // Fetch Role IDs
    $roleIds = $pdo->query("SELECT slug, id FROM roles")->fetchAll(PDO::FETCH_KEY_PAIR);

    // 2. Permissions
    $permissions = [
        // Granular Permissions (Section 5)
        ['name' => 'Create Complaint', 'slug' => 'complaint.create', 'module' => 'complaint', 'description' => 'Submit new grievances'],
        ['name' => 'View Own Complaints', 'slug' => 'complaint.view_own', 'module' => 'complaint', 'description' => 'View student own grievances'],
        ['name' => 'View Assigned Complaints', 'slug' => 'complaint.view_assigned', 'module' => 'complaint', 'description' => 'View explicitly assigned grievances'],
        ['name' => 'View Department Complaints', 'slug' => 'complaint.view_department', 'module' => 'complaint', 'description' => 'View department complaint queue'],
        ['name' => 'View Escalated Complaints', 'slug' => 'complaint.view_escalated', 'module' => 'complaint', 'description' => 'View escalated and critical complaints'],
        ['name' => 'View Confidential Complaints', 'slug' => 'complaint.view_confidential', 'module' => 'complaint', 'description' => 'View sensitive and confidential cases'],
        ['name' => 'Assign Complaint', 'slug' => 'complaint.assign', 'module' => 'complaint', 'description' => 'Assign complaints to faculty/staff'],
        ['name' => 'Update Complaint Status', 'slug' => 'complaint.update_status', 'module' => 'complaint', 'description' => 'Update status within lifecycle rules'],
        ['name' => 'Add Internal Note', 'slug' => 'complaint.add_internal_note', 'module' => 'complaint', 'description' => 'Add confidential officer/staff internal notes'],
        ['name' => 'Escalate Complaint', 'slug' => 'complaint.escalate', 'module' => 'complaint', 'description' => 'Escalate unresolved or urgent cases'],
        ['name' => 'Close Complaint', 'slug' => 'complaint.close', 'module' => 'complaint', 'description' => 'Officially close verified resolutions'],
        ['name' => 'Reopen Complaint', 'slug' => 'complaint.reopen', 'module' => 'complaint', 'description' => 'Request or approve case reopening'],
        ['name' => 'Manage Users', 'slug' => 'user.manage', 'module' => 'admin', 'description' => 'Create, activate, suspend, deactivate accounts'],
        ['name' => 'Manage Roles', 'slug' => 'role.manage', 'module' => 'admin', 'description' => 'Provision and approve authorized roles'],
        ['name' => 'Manage Departments', 'slug' => 'department.manage', 'module' => 'admin', 'description' => 'Map users to departments and categories'],
        ['name' => 'View Own Reports', 'slug' => 'report.view_own', 'module' => 'report', 'description' => 'Personal grievance summary reports'],
        ['name' => 'View Department Reports', 'slug' => 'report.view_department', 'module' => 'report', 'description' => 'Department analytics and SLA performance'],
        ['name' => 'View Institution Reports', 'slug' => 'report.view_institution', 'module' => 'report', 'description' => 'Institution-wide grievance reports and exports'],
        ['name' => 'View Audit Logs', 'slug' => 'audit.view', 'module' => 'audit', 'description' => 'Inspect append-only security and activity logs'],
        ['name' => 'Manage System Settings', 'slug' => 'settings.manage', 'module' => 'admin', 'description' => 'Configure SLA, notifications, portal settings'],

        // Complementary / Legacy permission slugs
        ['name' => 'Create Complaint (Legacy)', 'slug' => 'complaints.create', 'module' => 'complaints', 'description' => 'Submit grievances'],
        ['name' => 'View Own Complaints (Legacy)', 'slug' => 'complaints.view.own', 'module' => 'complaints', 'description' => 'View personal complaints'],
        ['name' => 'View Assigned Complaints (Legacy)', 'slug' => 'complaints.view.assigned', 'module' => 'complaints', 'description' => 'View assigned grievances'],
        ['name' => 'View Department Complaints (Legacy)', 'slug' => 'complaints.view.dept', 'module' => 'complaints', 'description' => 'View departmental complaints'],
        ['name' => 'View All Complaints (Legacy)', 'slug' => 'complaints.view.all', 'module' => 'complaints', 'description' => 'View all complaints'],
        ['name' => 'Update Complaint Status (Legacy)', 'slug' => 'complaints.update.status', 'module' => 'complaints', 'description' => 'Advance complaint workflow status'],
        ['name' => 'Assign Complaints (Legacy)', 'slug' => 'complaints.assign', 'module' => 'complaints', 'description' => 'Assign complaints to faculty/officers'],
        ['name' => 'Resolve Complaints (Legacy)', 'slug' => 'complaints.resolve', 'module' => 'complaints', 'description' => 'Mark complaints resolved with summary'],
        ['name' => 'Delete Complaints (Legacy)', 'slug' => 'complaints.delete', 'module' => 'complaints', 'description' => 'Delete complaints'],
        ['name' => 'Submit Feedback (Legacy)', 'slug' => 'complaints.feedback', 'module' => 'complaints', 'description' => 'Submit resolution feedback/reopen'],
        ['name' => 'Add Comment (Legacy)', 'slug' => 'comments.create', 'module' => 'comments', 'description' => 'Post public comments'],
        ['name' => 'Add Internal Note (Legacy)', 'slug' => 'comments.internal', 'module' => 'comments', 'description' => 'Post officer-only internal notes'],
        ['name' => 'View Reports (Legacy)', 'slug' => 'reports.view', 'module' => 'reports', 'description' => 'Access analytics and summaries'],
        ['name' => 'Manage Users (Legacy)', 'slug' => 'users.manage', 'module' => 'users', 'description' => 'Create and modify user accounts and roles'],
        ['name' => 'Manage System (Legacy)', 'slug' => 'system.manage', 'module' => 'system', 'description' => 'System configuration and settings']
    ];

    $stmtPerm = $pdo->prepare("INSERT INTO permissions (name, slug, module, description) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description)");
    foreach ($permissions as $p) {
        $stmtPerm->execute([$p['name'], $p['slug'], $p['module'], $p['description']]);
    }
    echo "Seeded " . count($permissions) . " permissions.\n";

    $permIds = $pdo->query("SELECT slug, id FROM permissions")->fetchAll(PDO::FETCH_KEY_PAIR);

    // Map Role Permissions
    $rolePermMap = [
        'student' => [
            'complaint.create', 'complaint.view_own', 'complaint.reopen', 'report.view_own',
            'complaints.create', 'complaints.view.own', 'complaints.feedback', 'comments.create'
        ],
        'faculty' => [
            'complaint.view_assigned', 'complaint.update_status', 'complaint.escalate',
            'complaints.view.assigned', 'complaints.update.status', 'comments.create'
        ],
        'hod'     => [
            'complaint.view_department', 'complaint.assign', 'complaint.update_status', 'complaint.add_internal_note', 'complaint.escalate', 'report.view_department',
            'complaints.view.dept', 'complaints.assign', 'complaints.update.status', 'comments.create', 'comments.internal', 'reports.view'
        ],
        'officer' => [
            'complaint.view_department', 'complaint.view_escalated', 'complaint.view_confidential', 'complaint.assign', 'complaint.update_status', 'complaint.add_internal_note', 'complaint.escalate', 'complaint.close', 'complaint.reopen', 'report.view_institution',
            'complaints.view.all', 'complaints.assign', 'complaints.update.status', 'complaints.resolve', 'comments.create', 'comments.internal', 'reports.view'
        ],
        'admin'   => [
            'complaint.view_department', 'complaint.view_escalated', 'complaint.view_confidential', 'complaint.assign', 'complaint.update_status', 'complaint.add_internal_note', 'complaint.close', 'user.manage', 'role.manage', 'department.manage', 'report.view_institution', 'audit.view', 'settings.manage',
            'complaints.view.all', 'complaints.delete', 'users.manage', 'system.manage', 'reports.view', 'audit.view'
        ],
        'auditor' => [
            'report.view_institution', 'report.view_department', 'audit.view',
            'reports.view'
        ]
    ];

    $stmtRp = $pdo->prepare("INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)");
    foreach ($rolePermMap as $roleSlug => $slugs) {
        if (!isset($roleIds[$roleSlug])) continue;
        $rId = $roleIds[$roleSlug];
        foreach ($slugs as $slug) {
            if (isset($permIds[$slug])) {
                $stmtRp->execute([$rId, $permIds[$slug]]);
            }
        }
    }


    // 3. Departments
    $departments = [
        ['code' => 'CSE', 'name' => 'Computer Science & Engineering', 'description' => 'Department of CSE, software labs & technical infrastructure'],
        ['code' => 'ECE', 'name' => 'Electronics & Communication Engineering', 'description' => 'Department of ECE, hardware & VLSI labs'],
        ['code' => 'MECH', 'name' => 'Mechanical Engineering', 'description' => 'Mechanical labs, workshops & machinery'],
        ['code' => 'CIVIL', 'name' => 'Civil Engineering', 'description' => 'Civil engineering & campus surveying'],
        ['code' => 'ADMIN', 'name' => 'Administrative Affairs', 'description' => 'Accounts, certificates, admissions and student administration'],
        ['code' => 'HOSTEL', 'name' => 'Hostel & Residential Life', 'description' => 'Hostel rooms, mess, cleanliness, and wardens'],
        ['code' => 'INFRA', 'name' => 'Campus Infrastructure & Maintenance', 'description' => 'Power, water supply, air conditioning, classrooms and grounds'],
        ['code' => 'ACAD', 'name' => 'Academic Affairs & Examinations', 'description' => 'Curriculum, grade cards, examinations and scheduling']
    ];

    $stmtDept = $pdo->prepare("INSERT INTO departments (code, name, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description)");
    foreach ($departments as $d) {
        $stmtDept->execute([$d['code'], $d['name'], $d['description']]);
    }
    echo "Seeded " . count($departments) . " departments.\n";

    $deptIds = $pdo->query("SELECT code, id FROM departments")->fetchAll(PDO::FETCH_KEY_PAIR);

    // 4. Categories (from Section 8)
    $categories = [
        ['name' => 'Faculty and staff conduct', 'slug' => 'faculty-staff-conduct', 'sla' => 5, 'dept' => 'ACAD', 'desc' => 'Issues related to faculty behavior, responsiveness, or grading unfairness'],
        ['name' => 'Academics and subjects', 'slug' => 'academics-subjects', 'sla' => 4, 'dept' => 'ACAD', 'desc' => 'Curriculum coverage, syllabus delays, or subject allocation'],
        ['name' => 'Timetable and teaching support', 'slug' => 'timetable-teaching-support', 'sla' => 3, 'dept' => 'ACAD', 'desc' => 'Lecture overlaps, lab slot collisions, or missing teaching assistance'],
        ['name' => 'Examinations and academic administration', 'slug' => 'examinations-administration', 'sla' => 5, 'dept' => 'ACAD', 'desc' => 'Internal marks discrepancies, hall tickets, and re-evaluation'],
        ['name' => 'Classrooms and laboratories', 'slug' => 'classrooms-laboratories', 'sla' => 3, 'dept' => 'INFRA', 'desc' => 'Broken projectors, non-working computers, AC or lab equipment failures'],
        ['name' => 'Hostel facilities', 'slug' => 'hostel-facilities', 'sla' => 3, 'dept' => 'HOSTEL', 'desc' => 'Hostel room repairs, hot water, plumbing, or curfew issues'],
        ['name' => 'Canteen and food hygiene', 'slug' => 'canteen-food-hygiene', 'sla' => 2, 'dept' => 'ADMIN', 'desc' => 'Food safety, pricing, hygiene standards, or dining hall cleanliness'],
        ['name' => 'Library services', 'slug' => 'library-services', 'sla' => 3, 'dept' => 'ADMIN', 'desc' => 'Book availability, digital repository access, or reading room conditions'],
        ['name' => 'Transportation', 'slug' => 'transportation', 'sla' => 3, 'dept' => 'ADMIN', 'desc' => 'College bus routes, punctuality, or campus shuttle service'],
        ['name' => 'Internet and IT', 'slug' => 'internet-it', 'sla' => 2, 'dept' => 'INFRA', 'desc' => 'Campus Wi-Fi connectivity, portal downtime, or email access'],
        ['name' => 'Campus infrastructure', 'slug' => 'campus-infrastructure', 'sla' => 4, 'dept' => 'INFRA', 'desc' => 'Roadways, elevators, drinking water fountains, lighting, and sports grounds'],
        ['name' => 'Sanitation and environment', 'slug' => 'sanitation-environment', 'sla' => 2, 'dept' => 'INFRA', 'desc' => 'Restroom hygiene, waste disposal, and pest control'],
        ['name' => 'Safety and wellbeing', 'slug' => 'safety-wellbeing', 'sla' => 1, 'dept' => 'ADMIN', 'desc' => 'Security patrol, medical first aid, emergency lighting, mental health support'],
        ['name' => 'Harassment, bullying and discrimination', 'slug' => 'harassment-discrimination', 'sla' => 1, 'dept' => 'ADMIN', 'desc' => 'Strict anti-ragging, bullying, gender discrimination, or harassment reports'],
        ['name' => 'Fees, certificates and administration', 'slug' => 'fees-certificates-admin', 'sla' => 5, 'dept' => 'ADMIN', 'desc' => 'Fee receipts, bona fide certificates, transcripts, or scholarship verification'],
        ['name' => 'Scholarships and student services', 'slug' => 'scholarships-services', 'sla' => 5, 'dept' => 'ADMIN', 'desc' => 'Government/institutional scholarship approvals and financial aid counseling'],
        ['name' => 'Other issues', 'slug' => 'other-issues', 'sla' => 7, 'dept' => 'ADMIN', 'desc' => 'General queries, campus event permissions, or feedback']
    ];

    $stmtCat = $pdo->prepare("INSERT INTO categories (name, slug, description, department_id, sla_days, is_active) VALUES (?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE description=VALUES(description), sla_days=VALUES(sla_days), department_id=VALUES(department_id)");
    foreach ($categories as $c) {
        $dId = $deptIds[$c['dept']] ?? null;
        $stmtCat->execute([$c['name'], $c['slug'], $c['desc'], $dId, $c['sla']]);
    }
    echo "Seeded " . count($categories) . " categories.\n";

    $catIds = $pdo->query("SELECT slug, id FROM categories")->fetchAll(PDO::FETCH_KEY_PAIR);

    // 5. Seed Users
    $defaultPasswordHash = password_hash('Password@123', PASSWORD_BCRYPT);

    $users = [
        [
            'username' => 'admin',
            'email' => 'admin@campuscare.edu',
            'full_name' => 'System Administrator',
            'phone' => '+91 98765 43210',
            'role' => 'admin',
            'dept' => 'ADMIN',
            'roll' => null
        ],
        [
            'username' => 'officer',
            'email' => 'officer@campuscare.edu',
            'full_name' => 'Dr. K. Ramanathan (Grievance Officer)',
            'phone' => '+91 98765 43211',
            'role' => 'officer',
            'dept' => 'ADMIN',
            'roll' => null
        ],
        [
            'username' => 'hod_cse',
            'email' => 'hod.cse@campuscare.edu',
            'full_name' => 'Prof. S. Venkatesh (HOD CSE)',
            'phone' => '+91 98765 43212',
            'role' => 'hod',
            'dept' => 'CSE',
            'roll' => null
        ],
        [
            'username' => 'prof_sharma',
            'email' => 'prof.sharma@campuscare.edu',
            'full_name' => 'Dr. Meera Sharma (Faculty CSE)',
            'phone' => '+91 98765 43213',
            'role' => 'faculty',
            'dept' => 'CSE',
            'roll' => null
        ],
        [
            'username' => 'auditor',
            'email' => 'auditor@campuscare.edu',
            'full_name' => 'Rajesh N. (Quality & Compliance Auditor)',
            'phone' => '+91 98765 43214',
            'role' => 'auditor',
            'dept' => 'ADMIN',
            'roll' => null
        ],
        [
            'username' => 'student_arun',
            'email' => 'arun.student@campuscare.edu',
            'full_name' => 'Arun Kumar',
            'phone' => '+91 98765 11001',
            'role' => 'student',
            'dept' => 'CSE',
            'roll' => '2023CSE042'
        ],
        [
            'username' => 'student_priya',
            'email' => 'priya.student@campuscare.edu',
            'full_name' => 'Priya Sundaram',
            'phone' => '+91 98765 11002',
            'role' => 'student',
            'dept' => 'ECE',
            'roll' => '2024ECE019'
        ]
    ];

    $stmtUser = $pdo->prepare("INSERT INTO users (username, email, password_hash, full_name, phone, role_id, department_id, roll_number, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), phone=VALUES(phone), role_id=VALUES(role_id), department_id=VALUES(department_id), roll_number=VALUES(roll_number)");

    foreach ($users as $u) {
        $rId = $roleIds[$u['role']];
        $dId = $deptIds[$u['dept']] ?? null;
        $stmtUser->execute([$u['username'], $u['email'], $defaultPasswordHash, $u['full_name'], $u['phone'], $rId, $dId, $u['roll']]);
    }
    echo "Seeded " . count($users) . " users. (Default password: Password@123)\n";

    $userIds = $pdo->query("SELECT username, id FROM users")->fetchAll(PDO::FETCH_KEY_PAIR);

    // 5.1 Seed Authorized Student Registry
    $registryRecords = [
        [
            'roll_number'   => '2023CSE042',
            'email'         => 'arun.student@campuscare.edu',
            'full_name'     => 'Arun Kumar',
            'phone'         => '+91 98765 11001',
            'dept'          => 'CSE',
            'is_activated'  => 1
        ],
        [
            'roll_number'   => '2024ECE019',
            'email'         => 'priya.student@campuscare.edu',
            'full_name'     => 'Priya Sundaram',
            'phone'         => '+91 98765 11002',
            'dept'          => 'ECE',
            'is_activated'  => 1
        ],
        [
            'roll_number'   => '2026CSE099',
            'email'         => 'kavya.student@campuscare.edu',
            'full_name'     => 'Kavya Mohan',
            'phone'         => '+91 98765 11003',
            'dept'          => 'CSE',
            'is_activated'  => 0
        ],
        [
            'roll_number'   => '2026MECH055',
            'email'         => 'rohit.student@campuscare.edu',
            'full_name'     => 'Rohit Verma',
            'phone'         => '+91 98765 11004',
            'dept'          => 'MECH',
            'is_activated'  => 0
        ],
        [
            'roll_number'   => '2026CIVIL012',
            'email'         => 'ananya.student@campuscare.edu',
            'full_name'     => 'Ananya Iyer',
            'phone'         => '+91 98765 11005',
            'dept'          => 'CIVIL',
            'is_activated'  => 0
        ]
    ];

    $stmtReg = $pdo->prepare("
        INSERT INTO student_registry (roll_number, email, full_name, phone, department_id, is_activated)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), phone=VALUES(phone), department_id=VALUES(department_id), is_activated=VALUES(is_activated)
    ");
    foreach ($registryRecords as $reg) {
        $dId = $deptIds[$reg['dept']] ?? null;
        $stmtReg->execute([$reg['roll_number'], $reg['email'], $reg['full_name'], $reg['phone'], $dId, $reg['is_activated']]);
    }
    echo "Seeded " . count($registryRecords) . " student registry records (verified college registry).\n";

    // 6. Seed Realistic Complaints
    $complaintsData = [
        [
            'ref' => 'CC-2026-00101',
            'student' => 'student_arun',
            'dept' => 'INFRA',
            'cat' => 'classrooms-laboratories',
            'sub' => 'Projector HDMI Audio & Display',
            'title' => 'Projector flickering and distorted in Lab 304',
            'desc' => 'During Operating Systems lab sessions in room 304, the ceiling projector continually disconnects every 5 minutes and displays magenta tint. Students at the back rows cannot view the demonstrations.',
            'priority' => 'High',
            'conf' => 'Standard',
            'anon' => 0,
            'status' => 'In Progress',
            'assigned_user' => 'prof_sharma',
            'assigned_dept' => 'CSE',
            'days_ago' => 3,
            'due_days' => 2
        ],
        [
            'ref' => 'CC-2026-00102',
            'student' => 'student_priya',
            'dept' => 'INFRA',
            'cat' => 'internet-it',
            'sub' => 'Hostel Block B Wi-Fi',
            'title' => 'Hostel Block B 3rd Floor Wi-Fi Access Point unreachable',
            'desc' => 'Wi-Fi router near room B-312 has had a solid red warning LED since yesterday evening. Students cannot connect to college research repositories or complete assignment submissions.',
            'priority' => 'Urgent',
            'conf' => 'Standard',
            'anon' => 0,
            'status' => 'Assigned',
            'assigned_user' => 'officer',
            'assigned_dept' => 'INFRA',
            'days_ago' => 1,
            'due_days' => 1
        ],
        [
            'ref' => 'CC-2026-00103',
            'student' => 'student_arun',
            'dept' => 'ADMIN',
            'cat' => 'canteen-food-hygiene',
            'sub' => 'Main Dining Hall Drinking Water',
            'title' => 'Water filter dispenser leaking and dirty filters in North Mess',
            'desc' => 'The UV water purification unit in North Canteen shows overdue maintenance warning and the tray is overflowing onto the dining floor causing slipping hazards.',
            'priority' => 'High',
            'conf' => 'Standard',
            'anon' => 0,
            'status' => 'Resolved',
            'assigned_user' => 'officer',
            'assigned_dept' => 'ADMIN',
            'days_ago' => 5,
            'due_days' => -1,
            'resolved' => true,
            'resolution_summary' => 'Facilities team serviced the RO filter cartridge, cleaned drip tray, and sanitized dispenser on 17-Oct-2026.'
        ],
        [
            'ref' => 'CC-2026-00104',
            'student' => 'student_priya',
            'dept' => 'ADMIN',
            'cat' => 'safety-wellbeing',
            'sub' => 'Campus Perimeter Street Lights',
            'title' => 'Inadequate walkway lighting between Library and Girls Hostel',
            'desc' => 'Three pole lights along the garden walkway leading to Kasturba Hostel have been completely out for the past week, making it pitch dark after 7:30 PM.',
            'priority' => 'Urgent',
            'conf' => 'Confidential',
            'anon' => 0,
            'status' => 'Under Review',
            'assigned_user' => 'officer',
            'assigned_dept' => 'ADMIN',
            'days_ago' => 2,
            'due_days' => 1
        ],
        [
            'ref' => 'CC-2026-00105',
            'student' => 'student_arun',
            'dept' => 'ACAD',
            'cat' => 'examinations-administration',
            'sub' => 'Grade Card Name Spelling Correction',
            'title' => 'Typo in Semester 4 Grade Card Student Name',
            'desc' => 'My grade card issued last week has my surname misspelled as Kumarr instead of Kumar. Need an amended certified copy for passport renewal.',
            'priority' => 'Medium',
            'conf' => 'Standard',
            'anon' => 0,
            'status' => 'Submitted',
            'assigned_user' => null,
            'assigned_dept' => 'ACAD',
            'days_ago' => 0,
            'due_days' => 5
        ],
        [
            'ref' => 'CC-2026-00106',
            'student' => 'student_priya',
            'dept' => 'HOSTEL',
            'cat' => 'hostel-facilities',
            'sub' => 'Hot Water Supply',
            'title' => 'Solar geyser heating coils tripped in Block A',
            'desc' => 'No hot water in Block A common washrooms for the third consecutive morning.',
            'priority' => 'Medium',
            'conf' => 'Standard',
            'anon' => 0,
            'status' => 'Closed',
            'assigned_user' => 'officer',
            'assigned_dept' => 'HOSTEL',
            'days_ago' => 7,
            'due_days' => -4,
            'resolved' => true,
            'closed' => true,
            'resolution_summary' => 'Electrician replaced the thermal cutout fuse and tested hot water delivery. Student confirmed satisfactory temperature.'
        ]
    ];

    $stmtC = $pdo->prepare("INSERT INTO complaints
        (reference_number, student_id, department_id, category_id, subcategory, title, description, priority, confidentiality_level, is_anonymous, status, assigned_to_user_id, assigned_to_dept_id, due_date, resolution_summary, resolved_at, closed_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE status=VALUES(status), resolution_summary=VALUES(resolution_summary)");

    $stmtHist = $pdo->prepare("INSERT INTO complaint_status_history (complaint_id, changed_by_user_id, old_status, new_status, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)");
    $stmtComm = $pdo->prepare("INSERT INTO complaint_comments (complaint_id, user_id, is_internal, comment_text, created_at) VALUES (?, ?, ?, ?, ?)");
    $stmtNotif = $pdo->prepare("INSERT INTO notifications (user_id, title, message, link, type, created_at) VALUES (?, ?, ?, ?, ?, ?)");

    foreach ($complaintsData as $cd) {
        $sId = $userIds[$cd['student']];
        $dId = $deptIds[$cd['dept']];
        $cId = $catIds[$cd['cat']];
        $auId = isset($cd['assigned_user']) ? ($userIds[$cd['assigned_user']] ?? null) : null;
        $adId = isset($cd['assigned_dept']) ? ($deptIds[$cd['assigned_dept']] ?? null) : null;

        $createdTs = date('Y-m-d H:i:s', strtotime("-{$cd['days_ago']} days 09:30:00"));
        $dueTs = date('Y-m-d H:i:s', strtotime("+{$cd['due_days']} days 17:00:00"));
        $resolvedTs = !empty($cd['resolved']) ? date('Y-m-d H:i:s', strtotime("-1 days 16:00:00")) : null;
        $closedTs = !empty($cd['closed']) ? date('Y-m-d H:i:s', strtotime("today 10:00:00")) : null;
        $summary = $cd['resolution_summary'] ?? null;

        $stmtC->execute([
            $cd['ref'], $sId, $dId, $cId, $cd['sub'], $cd['title'], $cd['desc'],
            $cd['priority'], $cd['conf'], $cd['anon'], $cd['status'],
            $auId, $adId, $dueTs, $summary, $resolvedTs, $closedTs, $createdTs, $createdTs
        ]);

        $complaintId = $pdo->lastInsertId();
        if (!$complaintId) {
            $stmtFind = $pdo->prepare("SELECT id FROM complaints WHERE reference_number = ?");
            $stmtFind->execute([$cd['ref']]);
            $complaintId = $stmtFind->fetchColumn();
        }

        // Add status history
        $stmtHist->execute([$complaintId, $sId, 'None', 'Submitted', 'Grievance submitted by student', $createdTs]);
        if ($cd['status'] !== 'Submitted') {
            $stmtHist->execute([$complaintId, $userIds['officer'], 'Submitted', $cd['status'], 'Status advanced per grievance investigation procedure', date('Y-m-d H:i:s', strtotime($createdTs . ' + 1 hour'))]);
        }

        // Add comments
        $stmtComm->execute([
            $complaintId,
            $sId,
            0,
            "Thank you for looking into this. Please note it affects regular classroom lab operations.",
            date('Y-m-d H:i:s', strtotime($createdTs . ' + 2 hours'))
        ]);

        if ($cd['status'] === 'In Progress' || $cd['status'] === 'Assigned') {
            $stmtComm->execute([
                $complaintId,
                $userIds['officer'],
                1,
                "Internal Note: Assigned technician team dispatched with replacement cables and HDMI testing kit.",
                date('Y-m-d H:i:s', strtotime($createdTs . ' + 3 hours'))
            ]);
            $stmtComm->execute([
                $complaintId,
                $userIds['officer'],
                0,
                "Our team has inspected the unit and work is in progress. An update will be posted within 24 hours.",
                date('Y-m-d H:i:s', strtotime($createdTs . ' + 4 hours'))
            ]);
        }

        // Add student notification
        $stmtNotif->execute([
            $sId,
            "Complaint {$cd['ref']} Updated",
            "Your grievance '{$cd['title']}' is currently marked as {$cd['status']}.",
            "complaint-details.html?ref={$cd['ref']}",
            "info",
            $createdTs
        ]);
    }
    echo "Seeded sample complaints, history, comments, and notifications successfully.\n";

    // 7. Seed sample audit logs
    $auditLogs = [
        ['user' => 'admin', 'action' => 'SYSTEM_INIT', 'type' => 'system', 'id' => 1, 'details' => 'CampusCare system database initialized and seeded'],
        ['user' => 'officer', 'action' => 'COMPLAINT_ASSIGN', 'type' => 'complaint', 'id' => 1, 'details' => 'Assigned complaint CC-2026-00101 to Dr. Meera Sharma'],
        ['user' => 'student_arun', 'action' => 'COMPLAINT_SUBMIT', 'type' => 'complaint', 'id' => 1, 'details' => 'Student Arun Kumar submitted grievance CC-2026-00101'],
        ['user' => 'officer', 'action' => 'COMPLAINT_RESOLVE', 'type' => 'complaint', 'id' => 3, 'details' => 'Marked grievance CC-2026-00103 as Resolved']
    ];

    $stmtAudit = $pdo->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, details, created_at) VALUES (?, ?, ?, ?, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', ?, NOW())");
    foreach ($auditLogs as $a) {
        $uId = $userIds[$a['user']] ?? null;
        $stmtAudit->execute([$uId, $a['action'], $a['type'], $a['id'], $a['details']]);
    }
    echo "Seeded audit log entries.\n";

    echo "Seeding completed successfully!\n";
} catch (Exception $e) {
    echo "Seeding failed: " . $e->getMessage() . "\n";
    exit(1);
}
