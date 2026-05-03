<?php

/**
 * POST /api/projects/save.php
 * Auth: Bearer token required
 * Body: { "switchboard": {...}, "printOptions": {...} }
 * Returns: { "status": "ok", "id": projectId }
 *
 * Status: STUB — implement in Sprint 3.
 *         This file replaces the legacy cloud save endpoint.
 */

declare(strict_types=1);

require_once __DIR__ . '/../libs/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'code' => 'method_not_allowed']);
    exit;
}

http_response_code(501);
echo json_encode(['status' => 'error', 'code' => 'not_implemented']);
