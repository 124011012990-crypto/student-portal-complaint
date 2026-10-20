@echo off
TITLE CampusCare — Automated Verification Suite
echo ========================================================
echo   CampusCare: Automated Test and Verification Suite       
echo ========================================================
echo.

IF EXIST "C:\xampp\php\php.exe" (
    SET PHP_CMD="C:\xampp\php\php.exe"
) ELSE (
    SET PHP_CMD=php
)

%PHP_CMD% backend\tests\run_tests.php
echo.
echo Running Live HTTP API Integration Tests...
%PHP_CMD% backend\tests\http_test.php
echo.
echo Running Six Role-Specific Dashboards Verification...
%PHP_CMD% backend\tests\test_role_dashboards.php
echo.

pause
