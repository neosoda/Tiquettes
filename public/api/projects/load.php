<?php

/**
 * GET /api/projects/load.php?id={projectId}
 * Auth: Bearer token required (or valid share token via ?token=)
 * Returns: { "status": "ok", "project": { switchboard, printOptions } }
 *
 * Status: STUB — implement in Sprint 3.
 *         This file replaces the legacy cloud load endpoint.
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
