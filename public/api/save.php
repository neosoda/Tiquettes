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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit_error('Méthode non autorisée.', 'save', 'METHOD_NOT_ALLOWED');
}

// Validate and extract the instance ID from X-UFIID header
$ufiid = trim((string) ($_SERVER['HTTP_X_UFIID'] ?? ''));
if ($ufiid === '') {
    http_response_code(400);
    exit_error('Instance ID manquant.', 'save', 'MISSING_UFIID');
}
if (!preg_match('/^[a-zA-Z0-9_\-]{8,128}$/', $ufiid)) {
    http_response_code(400);
    exit_error('Instance ID invalide.', 'save', 'INVALID_UFIID');
}

// Accept JSON body or form-encoded body
$rawBody = file_get_contents('php://input');
$body = [];
$contentType = trim(strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? '')));

if (str_contains($contentType, 'application/json')) {
    $decoded = json_decode($rawBody, true);
    if (is_array($decoded)) {
        $body = $decoded;
    }
} else {
    parse_str($rawBody, $body);
}

$switchboardRaw = trim((string) ($body['switchboard'] ?? ''));
if ($switchboardRaw === '') {
    http_response_code(400);
    exit_error('Données du tableau manquantes.', 'save', 'MISSING_SWITCHBOARD');
}

// Validate that switchboard is valid JSON
$switchboard = json_decode($switchboardRaw, true);
if (!is_array($switchboard)) {
    http_response_code(400);
    exit_error('Données du tableau invalides (JSON malformé).', 'save', 'INVALID_JSON');
}

// Cap payload size to 2 MB to prevent abuse
if (strlen($switchboardRaw) > 2 * 1024 * 1024) {
    http_response_code(413);
    exit_error('Données du tableau trop volumineuses.', 'save', 'PAYLOAD_TOO_LARGE');
}

// Optional fields
$paramsRaw = trim((string) ($body['params'] ?? ''));
$printOptionsRaw = trim((string) ($body['printOptions'] ?? ''));

$paramsJson = '{}';
if ($paramsRaw !== '') {
    $decodedParams = json_decode($paramsRaw, true);
    if (is_array($decodedParams)) {
        $paramsJson = $paramsRaw;
    }
}

$printOptionsJson = '{}';
if ($printOptionsRaw !== '') {
    $decodedPrintOptions = json_decode($printOptionsRaw, true);
    if (is_array($decodedPrintOptions) || is_object($decodedPrintOptions)) {
        $printOptionsJson = $printOptionsRaw;
    }
}

// Ensure the projects table exists
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

// Upsert: insert new or update existing project
$stmt = DB->prepare(<<<'SQL'
INSERT INTO projects (id, switchboard, params, print_options, created_at, updated_at)
VALUES (:id, :switchboard, :params, :print_options, datetime('now'), datetime('now'))
ON CONFLICT(id) DO UPDATE SET
    switchboard  = excluded.switchboard,
    params       = CASE WHEN :params_set THEN excluded.params ELSE projects.params END,
    print_options = CASE WHEN :po_set THEN excluded.print_options ELSE projects.print_options END,
    updated_at   = datetime('now')
SQL);

$stmt->execute([
    ':id'          => $ufiid,
    ':switchboard' => $switchboardRaw,
    ':params'      => $paramsJson,
    ':params_set'  => (int) ($paramsRaw !== ''),
    ':print_options' => $printOptionsJson,
    ':po_set'      => (int) ($printOptionsRaw !== ''),
]);

header('Content-Type: application/json');
echo json_encode([
    'status' => 'ok',
    'instanceId' => $ufiid,
    'ok' => true,
]);
