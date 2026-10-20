# CampusCare — Security Architecture & Protections

## 1. Authentication & Session Security
- **Bcrypt Password Hashing**: Passwords stored via `password_hash($pass, PASSWORD_BCRYPT)`. Plaintext passwords are never saved or logged.
- **Session Fixation Defense**: `session_regenerate_id(true)` called upon every successful login.
- **Cookie Security**:
  - `httponly`: Prevents JavaScript access to the session cookie.
  - `samesite=Lax`: Mitigates Cross-Site Request Forgery.
  - `secure`: Auto-enabled when served over HTTPS.
- **Brute-Force Rate Limiting**: After 5 consecutive failed login attempts, accounts are locked for 15 minutes, with IP-level request throttling.

## 2. Injection & XSS Mitigations
- **PDO Prepared Statements**: Emulation disabled (`PDO::ATTR_EMULATE_PREPARES => false`). Every query utilizes parameterized placeholders.
- **Formula Injection Defense (CSV)**: Exported spreadsheet cells beginning with dangerous characters (`=`, `+`, `-`, `@`, `\t`, `\r`) are automatically escaped with leading single quotes.
- **Contextual HTML Escaping**: `Security::escapeHtml()` escapes user-supplied text before rendering.
- **MIME Verification for Uploads**: Uploaded attachments are checked using `finfo` byte inspection, ensuring only genuine PNG, JPG, WEBP, and PDF documents are accepted. Files are renamed to non-predictable UUIDs and placed in private storage outside the web root.

## 3. Cross-Site Request Forgery (CSRF)
- Cryptographically secure 64-character tokens generated via `random_bytes(32)`.
- Verified using timing-attack-safe `hash_equals()`.
- Enforced on all state-changing endpoints (`POST`, `PUT`, `DELETE`).

## 4. HTTP Security Headers
Every API and page response sends:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
