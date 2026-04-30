<?php

/**
 * Vpanel - Générateur d'étiquettes pour tableaux et armoires électriques
 * Copyright (C) 2024-2026 Neosoda
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

declare(strict_types=1);

require_once __DIR__ . '/libs/config.php';

// Bootstrap projects table if first run (init.sqlite.sql may not have run)
DB->exec("
    CREATE TABLE IF NOT EXISTS projects (
        ufiid       TEXT PRIMARY KEY,
        switchboard TEXT NOT NULL,
        params      TEXT NOT NULL DEFAULT '{}',
        print_options TEXT NOT NULL DEFAULT '{}',
        created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
        updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    )
");

// Resolve UFIID from header
$ufiid = trim((string) ($_SERVER['HTTP_X_UFIID'] ?? ''));

if ($ufiid === '' || !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $ufiid)) {
    header('HTTP/1.1 400 Bad Request');
    write_json(['error' => 'UFIID invalide ou manquant.']);
}

$stmt = DB->prepare('SELECT switchboard, params, print_options FROM projects WHERE ufiid = :ufiid LIMIT 1');
$stmt->execute([':ufiid' => $ufiid]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$row) {
    header('HTTP/1.1 404 Not Found');
    write_json(['error' => 'Projet introuvable.']);
}

$switchboard = json_decode($row['switchboard'], true);
if (!is_array($switchboard)) {
    header('HTTP/1.1 500 Internal Server Error');
    write_json(['error' => 'Projet corrompu — données JSON invalides.']);
}

$params      = json_decode($row['params'], true) ?? [];
$printOptions = json_decode($row['print_options'], true) ?? [];

write_json([
    'instanceId'   => $ufiid,
    'project'      => ['switchboard' => $switchboard],
    'params'       => $params,
    'printOptions' => $printOptions,
]);
