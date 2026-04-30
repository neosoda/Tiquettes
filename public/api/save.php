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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('HTTP/1.1 405 Method Not Allowed');
    header('Allow: POST');
    exit(0);
}

require_once __DIR__ . '/libs/config.php';

// Bootstrap projects table if first run
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

// Read and validate switchboard payload
$raw = $_POST['switchboard'] ?? '';
if ($raw === '') {
    // Fallback: read raw body (axios may send JSON body)
    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true);
    $raw = is_array($body) && isset($body['switchboard']) ? $body['switchboard'] : $raw;
}

if (!is_string($raw) || $raw === '') {
    header('HTTP/1.1 400 Bad Request');
    write_json(['error' => 'Données switchboard manquantes.']);
}

if (strlen($raw) > 2 * 1024 * 1024) {
    header('HTTP/1.1 413 Payload Too Large');
    write_json(['error' => 'Le projet dépasse la taille maximale autorisée (2 Mo).']);
}

$decoded = json_decode($raw, true);
if (!is_array($decoded)) {
    header('HTTP/1.1 400 Bad Request');
    write_json(['error' => 'Données switchboard JSON invalides.']);
}

// Re-encode to normalise (strips any injected unicode, ensures valid JSON)
$switchboardJson = json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

// Optional: carry params / printOptions forward if supplied
$paramsRaw       = $_POST['params'] ?? '';
$printOptionsRaw = $_POST['print_options'] ?? '';

$paramsDecoded       = ($paramsRaw !== '') ? json_decode($paramsRaw, true) : null;
$printOptionsDecoded = ($printOptionsRaw !== '') ? json_decode($printOptionsRaw, true) : null;

// Upsert: INSERT or UPDATE
$stmt = DB->prepare("
    INSERT INTO projects (ufiid, switchboard, params, print_options, created_at, updated_at)
    VALUES (:ufiid, :switchboard, :params, :print_options,
            strftime('%Y-%m-%dT%H:%M:%SZ','now'),
            strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    ON CONFLICT(ufiid) DO UPDATE SET
        switchboard  = excluded.switchboard,
        params       = CASE WHEN :params_has_value THEN excluded.params ELSE params END,
        print_options = CASE WHEN :po_has_value THEN excluded.print_options ELSE print_options END,
        updated_at   = strftime('%Y-%m-%dT%H:%M:%SZ','now')
");

$paramsJson      = is_array($paramsDecoded) ? json_encode($paramsDecoded, JSON_UNESCAPED_UNICODE) : '{}';
$printOptionsJson = is_array($printOptionsDecoded) ? json_encode($printOptionsDecoded, JSON_UNESCAPED_UNICODE) : '{}';

$stmt->execute([
    ':ufiid'         => $ufiid,
    ':switchboard'   => $switchboardJson,
    ':params'        => $paramsJson,
    ':print_options' => $printOptionsJson,
    ':params_has_value' => is_array($paramsDecoded) ? 1 : 0,
    ':po_has_value'  => is_array($printOptionsDecoded) ? 1 : 0,
]);

write_json([
    'instanceId' => $ufiid,
    'ok'         => true,
]);
