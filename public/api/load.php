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

// Fetch project
$stmt = DB->prepare('SELECT switchboard, params, print_options FROM spaces WHERE id = ? LIMIT 1');
$stmt->execute([$ufiid]);
$row = $stmt->fetch(\PDO::FETCH_ASSOC);

if (!$row) {
    http_response_code(404);
    write_json(['error' => 'Projet introuvable. Il a peut-être été supprimé ou l\'identifiant est incorrect.']);
}

$switchboard = json_decode($row['switchboard'], true);
$params      = json_decode($row['params'],      true) ?? (object) [];
$printOptions = json_decode($row['print_options'], true) ?? (object) [];

if (!is_array($switchboard)) {
    http_response_code(422);
    write_json(['error' => 'Données du projet corrompues.']);
}

write_json([
    'instanceId'   => $ufiid,
    'project'      => ['switchboard' => $switchboard],
    'params'       => $params,
    'printOptions' => $printOptions,
]);
