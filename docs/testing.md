# CampusCare — Verification & Testing Checklist

## Automated Test Suite
CampusCare includes a standalone verification script located at `backend/tests/run_tests.php`.

### Running Automated Verification
```bash
# Using PHP CLI directly:
php backend/tests/run_tests.php

# Or using the Windows batch shortcut:
test.bat
```

### Verified Test Cases
1. **Database Connectivity**: Validates PDO connection to MySQL.
2. **Schema Verification**: Confirms all 14 database tables exist with proper columns and constraints.
3. **Password Verification**: Tests `password_verify()` against seeded bcrypt hashes.
4. **Session Security**: Verifies role extraction and user session persistence.
5. **CSRF Protection**: Verifies that valid tokens pass while tampered tokens are rejected.
6. **CSV Formula Injection Defense**: Asserts that leading `=`, `+`, `-`, `@` characters are neutralized.
7. **Complaint Creation**: Verifies unique reference generation (`CC-2026-XXXXX`).
8. **Lifecycle Status Transitions**: Validates transitions (`Submitted` → `Under Review` → `Assigned` → `In Progress` → `Resolved`).
9. **Staff Assignment**: Confirms delegating cases to faculty members.
10. **Confidentiality Restrictions**: Proves faculty are blocked from accessing `Confidential` cases while Grievance Officers can access them.
11. **In-App Notifications**: Asserts delivery of alerts on status changes.
12. **Audit Logging**: Asserts audit entries are logged for actions.
13. **Dashboard Aggregation**: Validates dynamic aggregation of live MySQL complaint records.
