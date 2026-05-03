<?php

/**
 * POST /api/shares/create.php
 * Auth: Bearer token required
 * Body: { "project_id": string, "access": "read|write", "expires_in_days": int }
 * Returns: { "status": "ok", "token": string, "url": string }
 *
 * Status: STUB — implement in Sprint 4.
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
