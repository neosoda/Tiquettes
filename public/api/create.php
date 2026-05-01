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
    exit_error('Méthode non autorisée.', 'create', 'METHOD_NOT_ALLOWED');
}

// Generate a cryptographically secure UUID v4
function generateUuidV4(): string
{
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0F) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3F) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
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
$paramsRaw = trim((string) ($body['params'] ?? ''));
$printOptionsRaw = trim((string) ($body['printOptions'] ?? ''));

// switchboard is required for creation
if ($switchboardRaw === '') {
    $switchboardRaw = '{}';
}

// Validate JSON
$switchboard = json_decode($switchboardRaw, true);
if (!is_array($switchboard)) {
    http_response_code(400);
    exit_error('Données du tableau invalides (JSON malformé).', 'create', 'INVALID_JSON');
}

if (strlen($switchboardRaw) > 2 * 1024 * 1024) {
    http_response_code(413);
    exit_error('Données du tableau trop volumineuses.', 'create', 'PAYLOAD_TOO_LARGE');
}

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

$instanceId = generateUuidV4();

$stmt = DB->prepare(<<<'SQL'
INSERT INTO projects (id, switchboard, params, print_options, created_at, updated_at)
VALUES (:id, :switchboard, :params, :print_options, datetime('now'), datetime('now'))
SQL);

$stmt->execute([
    ':id'            => $instanceId,
    ':switchboard'   => $switchboardRaw,
    ':params'        => $paramsJson,
    ':print_options' => $printOptionsJson,
]);

http_response_code(201);
header('Content-Type: application/json');
echo json_encode([
    'status' => 'ok',
    'instanceId' => $instanceId,
    'ok' => true,
]);
