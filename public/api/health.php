<?php

/**
 * Vpanel - Health endpoint for container readiness/liveness.
 * Returns HTTP 200 when core checks pass, otherwise HTTP 503.
 */

declare(strict_types=1);

require_once __DIR__ . '/libs/config.php';

$checks = [];

// Database connectivity (SQLite)
try {
    DB->query('SELECT 1');
    $checks['sqlite'] = ['ok' => true];
} catch (\Throwable $e) {
    $checks['sqlite'] = ['ok' => false, 'error' => $e->getMessage()];
}

// Required runtime asset for PDF generation
$schemaFunctionsPath = __DIR__ . '/libs/toPdf/assets/schema_functions.json';
$checks['schema_functions_json'] = [
    'ok' => is_file($schemaFunctionsPath) && is_readable($schemaFunctionsPath),
    'path' => $schemaFunctionsPath,
];

// PDF backend capability (required for icon/symbol rasterization)
$convertAvailable = false;
try {
    $retval = 0;
    $ret = exec('convert -version', $out, $retval);
    $convertAvailable = $ret !== false && $retval === 0;
} catch (\Throwable $e) {
    $convertAvailable = false;
}
$checks['pdf_backend_available'] = [
    'ok' => extension_loaded('imagick') || $convertAvailable,
    'imagick' => extension_loaded('imagick'),
    'convert_cli' => $convertAvailable,
];

// Runtime-writable directories
$sqliteDir = dirname(SQLITE_DB_PATH);
$iconCacheDir = __DIR__ . '/libs/toPdf/themes/icons';
if (!is_dir($iconCacheDir)) {
    @mkdir($iconCacheDir, 0775, true);
}
$checks['sqlite_directory_writable'] = ['ok' => is_dir($sqliteDir) && is_writable($sqliteDir), 'path' => $sqliteDir];
$checks['icon_cache_writable'] = ['ok' => is_dir($iconCacheDir) && is_writable($iconCacheDir), 'path' => $iconCacheDir];

// Project persistence: ensure projects table is accessible
try {
    DB->exec(<<<'SQL'
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    switchboard TEXT NOT NULL DEFAULT '{}',
    params TEXT NOT NULL DEFAULT '{}',
    print_options TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
SQL);
    DB->query('SELECT COUNT(*) FROM projects');
    $checks['projects_table'] = ['ok' => true];
} catch (\Throwable $e) {
    $checks['projects_table'] = ['ok' => false, 'error' => $e->getMessage()];
}

$statusOk = array_reduce($checks, static function (bool $carry, array $item): bool {
    return $carry && (($item['ok'] ?? false) === true);
}, true);

http_response_code($statusOk ? 200 : 503);
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'status' => $statusOk ? 'ok' : 'error',
    'mode' => MODE,
    'timestamp' => NOW->format('c'),
    'checks' => $checks,
], JSON_UNESCAPED_SLASHES);
