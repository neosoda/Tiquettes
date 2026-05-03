<?php

/**
 * GET /api/projects/list.php
 * Auth: Bearer token required
 * Returns: { "status": "ok", "projects": [{id, name, updated_at, app_version}] }
 *
 * Status: STUB — implement in Sprint 3.
 */

declare(strict_types=1);

require_once __DIR__ . '/../libs/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'code' => 'method_not_allowed']);
    exit;
}

http_response_code(501);
echo json_encode(['status' => 'error', 'code' => 'not_implemented']);
