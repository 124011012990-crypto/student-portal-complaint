@echo off
TITLE CampusCare — Local Server
echo ========================================================
echo   CampusCare: Student Grievance & Complaint Portal      
echo ========================================================
echo.

IF EXIST "C:\xampp\php\php.exe" (
    SET PHP_CMD="C:\xampp\php\php.exe"
) ELSE (
    SET PHP_CMD=php
)

echo Checking database schema and tables...
%PHP_CMD% backend\database\migrate.php

echo.
echo Starting CampusCare server on http://localhost:8000 ...
echo (Running directly inside this terminal without opening external windows)
echo.
echo Press Ctrl+C in this terminal to stop the server anytime.
echo.

:: Open default browser to the application
start "" http://localhost:8000/index.html

:: Run unified server directly in current terminal session
%PHP_CMD% -S 0.0.0.0:8000 dev-router.php
