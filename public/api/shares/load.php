<?php

/**
 * GET /api/shares/load.php?token={shareToken}
 * No auth required — public read access via token.
 * Returns: { "status": "ok", "project": { switchboard, printOptions }, "access": "read|write" }
 *
 * Status: STUB — implement in Sprint 4.
 */

declare(strict_types=1);

require_once __DIR__ . '/../libs/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'code' => 'method_not_allowed']);
    exit;
}

$token = trim((string) ($_GET['token'] ?? ''));
if ($token === '') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'code' => 'missing_token']);
    exit;
}

http_response_code(501);
echo json_encode(['status' => 'error', 'code' => 'not_implemented']);
