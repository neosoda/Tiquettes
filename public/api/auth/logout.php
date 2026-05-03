<?php

/**
 * POST /api/auth/logout.php
 * Revokes the refresh token and clears the httpOnly cookie.
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

// Clear cookie immediately (safe even before full implementation)
setcookie('refresh_token', '', [
    'expires'  => time() - 3600,
    'path'     => '/api/',
    'httponly' => true,
    'secure'   => (MODE !== 'development'),
    'samesite' => 'Strict',
]);

echo json_encode(['status' => 'ok']);
