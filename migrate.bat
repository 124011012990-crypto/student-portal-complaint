@echo off
TITLE CampusCare — Database Migration Runner
echo ========================================================
echo   CampusCare: Database Migration & Schema Setup        
echo ========================================================
echo.

IF EXIST "C:\xampp\php\php.exe" (
    SET PHP_CMD="C:\xampp\php\php.exe"
) ELSE (
    SET PHP_CMD=php
)

%PHP_CMD% backend\database\migrate.php %*
echo.
echo Would you like to run the database seeder? (Y/N)
set /p SEED="Choose [Y/N]: "
if /i "%SEED%"=="Y" (
    %PHP_CMD% backend\database\seed.php
)

echo.
pause
