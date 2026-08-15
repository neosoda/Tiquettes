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
    write_json(['error' => 'Method not allowed']);
}

// Validate UFIID from header
$ufiid = trim((string) ($_SERVER['HTTP_X_UFIID'] ?? ''));
if ($ufiid === '' || !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $ufiid)) {
    http_response_code(400);
    write_json(['error' => 'Identifiant de projet invalide ou manquant.']);
}

// Read and validate payload
$rawSwitchboard = trim((string) ($_POST['switchboard'] ?? ''));
if ($rawSwitchboard === '') {
    // Try JSON body
    $body = (string) file_get_contents('php://input');
    if ($body !== '') {
        $decoded = json_decode($body, true);
        if (is_array($decoded) && isset($decoded['switchboard'])) {
            $rawSwitchboard = is_string($decoded['switchboard'])
                ? $decoded['switchboard']
                : json_encode($decoded['switchboard']);
        }
    }
}

if ($rawSwitchboard === '') {
    http_response_code(400);
    write_json(['error' => 'Données du tableau électrique manquantes.']);
}

// Validate JSON structure
$switchboard = json_decode($rawSwitchboard, true);
if (!is_array($switchboard)) {
    http_response_code(422);
    write_json(['error' => 'Format du tableau électrique invalide.']);
}

// Enforce a maximum payload size (1 MB)
if (strlen($rawSwitchboard) > 1_048_576) {
    http_response_code(413);
    write_json(['error' => 'Projet trop volumineux (max 1 Mo).']);
}

// Ensure the spaces table exists
DB->exec("
    CREATE TABLE IF NOT EXISTS spaces (
        id          TEXT     PRIMARY KEY,
        switchboard TEXT     NOT NULL DEFAULT '{}',
        params      TEXT     NOT NULL DEFAULT '{}',
        print_options TEXT   NOT NULL DEFAULT '{}',
        created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
");

// Upsert the project — create on first save, update on subsequent saves
$now = NOW->format('Y-m-d H:i:s');

$stmt = DB->prepare('SELECT id FROM spaces WHERE id = ? LIMIT 1');
$stmt->execute([$ufiid]);
$exists = $stmt->fetchColumn();

if ($exists) {
    $stmt = DB->prepare('UPDATE spaces SET switchboard = ?, updated_at = ? WHERE id = ?');
    $stmt->execute([$rawSwitchboard, $now, $ufiid]);
} else {
    $stmt = DB->prepare('INSERT INTO spaces (id, switchboard, created_at, updated_at) VALUES (?, ?, ?, ?)');
    $stmt->execute([$ufiid, $rawSwitchboard, $now, $now]);
}

write_json([
    'instanceId' => $ufiid,
    'ok'         => true,
    'savedAt'    => $now,
]);
