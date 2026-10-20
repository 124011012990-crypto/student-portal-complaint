<?php
/**
 * CampusCare — Automated Verification for All 6 Role-Specific Dashboards
 */

$baseUrl = 'http://127.0.0.1:8000/api';
$passed = 0;
$failed = 0;

function report(bool $cond, string $msg): void {
    global $passed, $failed;
    if ($cond) {
        $passed++;
        echo " [PASS] {$msg}\n";
    } else {
        $failed++;
        echo " [FAIL] {$msg}\n";
    }
}

function req(string $method, string $path, ?array $body = null, ?string $cookie = null): array {
    global $baseUrl;
    $url = $baseUrl . $path;
    $ch = curl_init($url);
    $headers = ['Content-Type: application/json', 'Accept: application/json'];

    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
    if ($cookie !== null) {
        $headers[] = 'Cookie: ' . $cookie;
    }

    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $response = curl_exec($ch);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $headerStr = substr($response, 0, $headerSize);
    $bodyStr = substr($response, $headerSize);
    $json = json_decode($bodyStr, true);

    preg_match_all('/^Set-Cookie:\s*([^;]*)/mi', $headerStr, $matches);
    $cookies = [];
    foreach ($matches[1] as $item) {
        parse_str($item, $cookieItem);
        $cookies = array_merge($cookies, $cookieItem);
    }
    $cookieHeader = '';
    foreach ($cookies as $k => $v) {
        $cookieHeader .= "{$k}={$v}; ";
    }

    return [
        'status' => $status,
        'body'   => $json,
        'cookie' => trim($cookieHeader)
    ];
}

echo "========================================================\n";
echo "   CampusCare — Six Role-Specific Dashboards Verification \n";
echo "========================================================\n\n";

// 1. Student Dashboard Verification
$res = req('POST', '/auth/login', ['username' => 'student_arun', 'password' => 'Password@123']);
$studentCookie = $res['cookie'];
report($res['status'] === 200, "1. Student 'student_arun' logged in successfully");

$sumStudent = req('GET', '/dashboard/summary', null, $studentCookie);
report($sumStudent['status'] === 200, "Student summary API returns HTTP 200");
$roleDataStudent = $sumStudent['body']['data']['role_data'] ?? [];
report(isset($roleDataStudent['pending_ratings']), "Student dashboard contains 'pending_ratings' role payload");
report(!isset($roleDataStudent['assigned_queue']), "Student dashboard does not leak faculty assigned queue");
report(!isset($roleDataStudent['recent_security_events']), "Student dashboard does not leak system security events");

// 2. Faculty / Staff Dashboard Verification
$res = req('POST', '/auth/login', ['username' => 'prof_sharma', 'password' => 'Password@123']);
$facultyCookie = $res['cookie'];
report($res['status'] === 200, "2. Faculty 'prof_sharma' logged in successfully");

$sumFaculty = req('GET', '/dashboard/summary', null, $facultyCookie);
report($sumFaculty['status'] === 200, "Faculty summary API returns HTTP 200");
$roleDataFaculty = $sumFaculty['body']['data']['role_data'] ?? [];
report(isset($roleDataFaculty['assigned_queue']), "Faculty dashboard contains 'assigned_queue' role payload");
report(!isset($roleDataFaculty['unassigned_queue']), "Faculty dashboard does not leak HOD unassigned queue");

// 3. Department Coordinator / HOD Dashboard Verification
$res = req('POST', '/auth/login', ['username' => 'hod_cse', 'password' => 'Password@123']);
$hodCookie = $res['cookie'];
report($res['status'] === 200, "3. HOD 'hod_cse' logged in successfully");

$sumHod = req('GET', '/dashboard/summary', null, $hodCookie);
report($sumHod['status'] === 200, "HOD summary API returns HTTP 200");
$roleDataHod = $sumHod['body']['data']['role_data'] ?? [];
report(isset($roleDataHod['unassigned_queue']), "HOD dashboard contains 'unassigned_queue' department payload");
report(isset($roleDataHod['department_faculty']), "HOD dashboard contains 'department_faculty' workload payload");

// 4. Central Grievance Officer Dashboard Verification
$res = req('POST', '/auth/login', ['username' => 'officer', 'password' => 'Password@123']);
$officerCookie = $res['cookie'];
report($res['status'] === 200, "4. Grievance Officer 'officer' logged in successfully");

$sumOfficer = req('GET', '/dashboard/summary', null, $officerCookie);
report($sumOfficer['status'] === 200, "Grievance Officer summary API returns HTTP 200");
$roleDataOfficer = $sumOfficer['body']['data']['role_data'] ?? [];
report(isset($roleDataOfficer['escalated_queue']), "Grievance Officer contains 'escalated_queue' payload");
report(isset($roleDataOfficer['confidential_queue']), "Grievance Officer contains 'confidential_queue' payload");
report(isset($roleDataOfficer['pending_closure_queue']), "Grievance Officer contains 'pending_closure_queue' payload");

// 5. System Administrator Dashboard Verification
$res = req('POST', '/auth/login', ['username' => 'admin', 'password' => 'Password@123']);
$adminCookie = $res['cookie'];
report($res['status'] === 200, "5. System Administrator 'admin' logged in successfully");

$sumAdmin = req('GET', '/dashboard/summary', null, $adminCookie);
report($sumAdmin['status'] === 200, "Admin summary API returns HTTP 200");
$roleDataAdmin = $sumAdmin['body']['data']['role_data'] ?? [];
report(isset($roleDataAdmin['user_roles_breakdown']), "Admin dashboard contains 'user_roles_breakdown' census payload");
report(isset($roleDataAdmin['recent_security_events']), "Admin dashboard contains 'recent_security_events' payload");
report(isset($roleDataAdmin['system_counts']), "Admin dashboard contains 'system_counts' payload");

// 6. Quality & Compliance Auditor Dashboard Verification
$res = req('POST', '/auth/login', ['username' => 'auditor', 'password' => 'Password@123']);
$auditorCookie = $res['cookie'];
report($res['status'] === 200, "6. Auditor 'auditor' logged in successfully");

$sumAuditor = req('GET', '/dashboard/summary', null, $auditorCookie);
report($sumAuditor['status'] === 200, "Auditor summary API returns HTTP 200");
$roleDataAuditor = $sumAuditor['body']['data']['role_data'] ?? [];
report(isset($roleDataAuditor['compliance_summary']), "Auditor dashboard contains 'compliance_summary' scorecard");
report(isset($roleDataAuditor['category_compliance']), "Auditor dashboard contains 'category_compliance' breakdown");
report(isset($roleDataAuditor['recent_audit_trail']), "Auditor dashboard contains 'recent_audit_trail' stream");

// 7. Cross-Role RBAC Security Boundaries
echo "\n--- RBAC Cross-Role Boundary & Protection Tests ---\n";

// Student forbidden from assigning complaints
$illegalAssign = req('POST', '/complaints/CC-2026-00001/assign', ['assigned_to_user_id' => 2], $studentCookie);
report(in_array($illegalAssign['status'], [401, 403]), "Student forbidden from executing complaint assignment (HTTP {$illegalAssign['status']})");

// Auditor forbidden from modifying complaint status
$illegalUpdate = req('POST', '/complaints/CC-2026-00001/update', ['status' => 'Resolved'], $auditorCookie);
report(in_array($illegalUpdate['status'], [400, 401, 403]), "Auditor strictly forbidden from modifying complaint status (HTTP {$illegalUpdate['status']})");

// Auditor forbidden from deleting complaints
$illegalDelete = req('POST', '/complaints/CC-2026-00001/delete', [], $auditorCookie);
report(in_array($illegalDelete['status'], [401, 403]), "Auditor strictly forbidden from deleting complaints (HTTP {$illegalDelete['status']})");

echo "\n========================================================\n";
echo "   Test Results: {$passed} Passed, {$failed} Failed\n";
echo "========================================================\n";
