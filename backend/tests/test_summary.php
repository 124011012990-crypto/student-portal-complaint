<?php

declare(strict_types=1);

spl_autoload_register(function ($class) {
    $prefix = 'App\\';
    $baseDir = dirname(__DIR__) . '/app/';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) return;
    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
    if (file_exists($file)) require_once $file;
});

use App\Config\Config;
use App\Services\ComplaintService;

Config::load(dirname(__DIR__) . '/.env');

try {
    echo "Testing student summary:\n";
    $student = ComplaintService::getDashboardSummary(1, 'student', null);
    echo "Student success, total=" . $student['metrics']['total'] . "\n";

    echo "Testing faculty summary:\n";
    $faculty = ComplaintService::getDashboardSummary(3, 'faculty', 1);
    echo "Faculty success, total=" . $faculty['metrics']['total'] . "\n";

    echo "Testing hod summary:\n";
    $hod = ComplaintService::getDashboardSummary(4, 'hod', 1);
    echo "HOD success, total=" . $hod['metrics']['total'] . "\n";

    echo "Testing officer summary:\n";
    $officer = ComplaintService::getDashboardSummary(2, 'officer', null);
    echo "Officer success, total=" . $officer['metrics']['total'] . "\n";

    echo "Testing admin summary:\n";
    $admin = ComplaintService::getDashboardSummary(5, 'admin', null);
    echo "Admin success, total=" . $admin['metrics']['total'] . "\n";

    echo "Testing auditor summary:\n";
    $auditor = ComplaintService::getDashboardSummary(6, 'auditor', null);
    echo "Auditor success, total=" . $auditor['metrics']['total'] . "\n";
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine() . "\n";
}
