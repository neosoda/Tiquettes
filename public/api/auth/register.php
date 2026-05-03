<?php

/**
 * POST /api/auth/register.php
 * Body: { "email": string, "password": string, "display_name": string }
 * Returns: { "status": "ok", "user": { id, email, display_name, plan } }
 *
 * Status: STUB — implement in Sprint 3.
 */

declare(strict_types=1);

require_once __DIR__ . '/../libs/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'code' => 'method_not_allowed']);
    exit;
}

http_response_code(501);
echo json_encode([
    'status'  => 'error',
    'code'    => 'not_implemented',
    'message' => 'Registration is not yet enabled on this instance.',
]);
