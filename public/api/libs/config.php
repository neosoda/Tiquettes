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

$_phpMode = getenv('PHP_APP_MODE');
$_phpMode = ($_phpMode !== false && $_phpMode !== '') ? strtolower(trim($_phpMode)) : 'development';
$_phpDebug = getenv('PHP_DEBUG');
if ($_phpDebug !== false && $_phpDebug !== '') {
    $_displayErrors = in_array(strtolower(trim((string) $_phpDebug)), ['1', 'true', 'yes', 'on'], true);
} else {
    $_displayErrors = $_phpMode === 'development';
}
ini_set('display_errors', $_displayErrors ? '1' : '0');
ini_set('display_startup_errors', $_displayErrors ? '1' : '0');
error_reporting(E_ALL);
unset($_phpMode, $_phpDebug, $_displayErrors);

define('MYIP_NORETURN', true);
require_once __DIR__ . '/../myip.php';

function dd_json(mixed $content): void
{
    /*write_json([
        'errors' => $content,
        'status' => 'error',
        'message' => $content
    ]);*/
    write_json([
        'error' => $content
    ]);
}

function write_json(mixed $content): void
{
    header('Content-Type: application/json');
    echo json_encode($content);
    exit;
}

function exit_error(string $message, string $lib = 'main', string $code = 'system', array $params = []): void
{
    echo json_encode(array_merge(
        [
            'status' => 'error',
            'code' => $code,
            'lib' => $lib,
            'message' => $message,
        ],
        $params
    ));
    exit;
}

function exit_ok(string $lib = 'main', array $params = []): void
{
    echo json_encode(array_merge(
        [
            'status' => 'ok',
            'lib' => $lib,
        ],
        $params
    ));
    exit;
}






function filter_string_polyfill(string $string): string
{
    $str = preg_replace('/\\x00|<[^>]*>?/', '', $string);
    return trim(str_replace(["'", '"'], ["'", '"'], $str));
}


// mode
// PHP_APP_MODE env var allows Docker/Coolify to override the default (avoids
// endpoints that do not pass ?m= from falling back to 'development' in prod).
$_defaultMode = getenv('PHP_APP_MODE');
$_defaultMode = ($_defaultMode !== false && $_defaultMode !== '') ? $_defaultMode : 'development';
$_mode = isset($_GET['m']) ? trim(rawurldecode($_GET['m'])) : $_defaultMode;
$_mode = strtolower($_mode);
if (!preg_match('/^[a-z0-9_-]+$/', $_mode)) {
    $_mode = $_defaultMode;
}
define('MODE', $_mode);
unset($_defaultMode, $_mode);

$constantsFile = __DIR__ . '/constants.' . MODE . '.php';
if (is_file($constantsFile) && is_readable($constantsFile)) {
    include_once $constantsFile;
}
unset($constantsFile);

if (!defined('STATS_IGNORE_LOCALHOST')) {
    define('STATS_IGNORE_LOCALHOST', false);
}
if (!defined('STATS_VISITS_INTERVAL')) {
    define('STATS_VISITS_INTERVAL', '30 minutes');
}


// cors
$accessControlHeaders = trim((string) ($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'] ?? ''));
if ($accessControlHeaders === '') {
    $accessControlHeaders = 'Content-Type, Authorization, X-Requested-With';
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: {$accessControlHeaders}");
    header("Access-Control-Max-Age: 1728000");
    header("Content-Length: 0");
    header("Content-Type: text/plain");
    exit(0);
}
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");


// datetime
define('LOCALE', 'fr_FR.UTF-8');
setlocale(LC_ALL, LOCALE);
define('TIMEZONE', 'Europe/Paris');
date_default_timezone_set(TIMEZONE);
define('NOW', (new \DateTime('now', new \DateTimeZone('UTC'))));
define('NOW_TIMESTAMP', NOW->getTimestamp());


// referer
$rfr = isset($_GET['rfr']) ? stripslashes(trim(rawurldecode($_GET['rfr']))) : ($_SERVER['HTTP_REFERER'] ?? $_SERVER['HTTP_HOST'] ?? '');
define('REFERER', $rfr);
if (MODE !== 'development') {
    $extractHost = static function (string $value): string {
        $candidate = trim(strtolower($value));
        if ($candidate === '') {
            return '';
        }
        $parsed = parse_url($candidate, PHP_URL_HOST);
        if (is_string($parsed) && $parsed !== '') {
            return trim(strtolower($parsed));
        }
        $candidate = preg_replace('#^https?://#i', '', $candidate);
        $candidate = explode('/', $candidate)[0];
        $candidate = explode(':', $candidate)[0];
        return trim(strtolower($candidate));
    };

    // ALLOWED_HOSTS can be defined in constants.<mode>.php to extend the list
    // with the site's own hostname (required for Coolify / self-hosted deployments).
    $defaultAllowedHosts = ['localhost', '127.0.0.1', 'www.vpanel.fr'];
    $runtimeHost = trim((string) (getenv('APP_HOSTNAME') ?: ''));
    if ($runtimeHost !== '') {
        $runtimeHost = preg_replace('#^https?://#i', '', $runtimeHost);
        $runtimeHost = explode('/', $runtimeHost)[0];
        $runtimeHost = trim($runtimeHost);
        if ($runtimeHost !== '') {
            $defaultAllowedHosts[] = $runtimeHost;
        }
    }
    $requestHost = trim((string) ($_SERVER['HTTP_HOST'] ?? ''));
    if ($requestHost !== '') {
        $defaultAllowedHosts[] = $requestHost;
    }
    $defaultAllowedHosts = array_values(array_unique(array_filter(array_map($extractHost, $defaultAllowedHosts), static fn($host) => $host !== '')));
    $allowedHosts = defined('ALLOWED_HOSTS') ? array_merge($defaultAllowedHosts, ALLOWED_HOSTS) : $defaultAllowedHosts;
    $allowedHosts = array_values(array_unique(array_filter(array_map($extractHost, $allowedHosts), static fn($host) => $host !== '')));
    $refererHost = $extractHost(REFERER);
    $hostIsAllowed = false;
    if ($refererHost !== '') {
        foreach ($allowedHosts as $allowedHost) {
            if ($refererHost === $allowedHost || str_ends_with($refererHost, '.' . $allowedHost)) {
                $hostIsAllowed = true;
                break;
            }
        }
    }
    if (!$hostIsAllowed) {
        header("HTTP/1.1 401 Unauthorized");
        exit(0);
    }
}


// parent referer
$prt = trim(isset($_GET['prt']) ? stripslashes(trim(rawurldecode($_GET['prt']))) : '');
if (stripos(strtolower($prt), 'vpanel.fr') !== false)
    $prt = '';
define('PARENT_REFERER', $prt);


// client infos
$ip = isset($_GET['ip']) ? trim(rawurldecode($_GET['ip'])) : '';
if (!filter_var($ip, FILTER_VALIDATE_IP)) {
    $ip = getRealUserIp();
    if (strpos((string)$ip, ',') !== false) {
        $ips = explode(',', (string)$ip);
        $ip = trim($ips[0]);
    }
    if (!filter_var($ip, FILTER_VALIDATE_IP)) {
        $ip = '0.0.0.0';
    }
}
define('CLIENT_IP', $ip);
define('CLIENT_TYPE', isBot() ? 'bot' : 'user');
define('CLIENT_FROM_LOCALHOST', CLIENT_IP === '127.0.0.1' || CLIENT_IP === '::1');


// user agent
$ua = trim(isset($_GET['ua']) ? trim(rawurldecode($_GET['ua'])) : (isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : ''));
define('USER_AGENT', $ua);


// database
try {
    if (!defined('SQLITE_DB_PATH')) {
        $envSqlitePath = trim((string) (getenv('SQLITE_DB_PATH') ?: ''));
        define('SQLITE_DB_PATH', $envSqlitePath !== '' ? $envSqlitePath : (__DIR__ . '/../../data/vpanel.sqlite'));
        unset($envSqlitePath);
    }
    $sqliteDir = dirname(SQLITE_DB_PATH);
    if (!is_dir($sqliteDir) && !mkdir($sqliteDir, 0775, true) && !is_dir($sqliteDir)) {
        throw new RuntimeException("Impossible de créer le dossier SQLite : {$sqliteDir}");
    }
    $pdo = new PDO("sqlite:" . SQLITE_DB_PATH);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('PRAGMA foreign_keys = ON;');
    define('DB', $pdo);
} catch (\Throwable $e) {
    dd_json(content: "Erreur SQLite : " . $e->getMessage());
    exit(0);
}
