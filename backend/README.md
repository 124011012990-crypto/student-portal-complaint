# CampusCare Backend

## Stack
- PHP 8.2+
- PDO MySQL
- Native PHP Sessions
- RESTful JSON API

## Directory Structure
- `app/Config/`: Configuration loader and Database PDO singleton
- `app/Controllers/`: Request controllers (Auth, Complaints, Users, etc.)
- `app/Services/`: Authorized business logic, lifecycle workflows, and audits
- `app/Middleware/`: Auth, Role, CSRF, and RateLimit middlewares
- `app/Helpers/`: Response JSON formatter, Session, Security, and FileUpload
- `app/Validators/`: Input validation engine
- `app/Core/`: Front-controller Router and base Controller
- `database/`: Schema definition (`schema.sql`), migration runner (`migrate.php`), and seeder (`seed.php`)
- `public/`: Web server document root (`index.php`, `.htaccess`)
- `storage/`: Private uploads, exports, logs, and temporary caches
- `tests/`: Automated test suite (`run_tests.php`)
