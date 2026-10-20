# MySQL Persistence & Administration Guide

## Database Overview
- **Database Name**: `campuscare_db`
- **Charset**: `utf8mb4`
- **Collation**: `utf8mb4_unicode_ci`

## Local MySQL / phpMyAdmin Administration
1. Open phpMyAdmin at `http://localhost/phpmyadmin/`.
2. Inspect or import `database.sql` found in the project root.
3. Verify that the 14 application tables and foreign key constraints are established.

## Docker MySQL Service
- Persistent volume: `campuscare_mysql_data`
- Automatically initialized from `./backend/database/schema.sql` on first startup.

### Backup Database
```bash
docker exec campuscare_mysql mysqldump -u root -p campuscare_db > backup.sql
```

### Restore Database
```bash
docker exec -i campuscare_mysql mysql -u root -p campuscare_db < backup.sql
```
