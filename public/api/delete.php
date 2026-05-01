<?php

/**
 * Vpanel - Générateur d'étiquettes pour tableaux et armoires électriques
 * Copyright (C) 2024-2026 Neosoda
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

declare(strict_types=1);

require_once __DIR__ . '/libs/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    exit_error('Méthode non autorisée.', 'delete', 'METHOD_NOT_ALLOWED');
}

// Validate and extract the instance ID from X-UFIID header
$ufiid = trim((string) ($_SERVER['HTTP_X_UFIID'] ?? ''));
if ($ufiid === '') {
    http_response_code(400);
    exit_error('Instance ID manquant.', 'delete', 'MISSING_UFIID');
}
if (!preg_match('/^[a-zA-Z0-9_\-]{8,128}$/', $ufiid)) {
    http_response_code(400);
    exit_error('Instance ID invalide.', 'delete', 'INVALID_UFIID');
}

// Ensure the projects table exists (no-op if already there)
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

$stmt = DB->prepare('DELETE FROM projects WHERE id = ?');
$stmt->execute([$ufiid]);
$deleted = $stmt->rowCount() > 0;

if (!$deleted) {
    http_response_code(404);
    exit_error('Projet introuvable.', 'delete', 'NOT_FOUND');
}

header('Content-Type: application/json');
echo json_encode([
    'status' => 'ok',
    'instanceId' => $ufiid,
    'ok' => true,
]);
