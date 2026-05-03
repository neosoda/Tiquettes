<?php

/**
 * POST /api/auth/login.php
 * Body: { "email": string, "password": string }
 * Returns: { "access_token": string, "user": { id, email, display_name, plan } }
 * Sets httpOnly cookie: refresh_token
 *
 * Status: STUB — implement when Sprint 3 begins.
 *         Returns 501 until JWT keys and users table are configured.
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
    'message' => 'Authentication is not yet enabled on this instance.',
]);
