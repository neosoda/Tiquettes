<?php

/**
 * SQLite-based rate limiter.
 *
 * Usage:
 *   rate_limit("login:{$ip}", 5, 60);   // 5 hits per 60 seconds
 *
 * The rate_limits table is created on first call if it doesn't exist.
 */

declare(strict_types=1);

/**
 * @param string $key      Unique bucket key (e.g. "login:127.0.0.1")
 * @param int    $maxHits  Allowed requests per window
 * @param int    $windowS  Window size in seconds
 *
 * @return void  Exits with 429 if rate limit exceeded.
 */
function rate_limit(string $key, int $maxHits = 5, int $windowS = 60): void
{
    static $tableCreated = false;

    if (!defined('DB')) return;

    if (!$tableCreated) {
        DB->exec("CREATE TABLE IF NOT EXISTS rate_limits (
            key          TEXT PRIMARY KEY,
            hits         INTEGER NOT NULL DEFAULT 1,
            window_start INTEGER NOT NULL
        )");
        $tableCreated = true;
    }

    $now = time();
    $windowStart = $now - $windowS;

    // Fetch existing record
    $stmt = DB->prepare('SELECT hits, window_start FROM rate_limits WHERE key = ?');
    $stmt->execute([$key]);
    $row = $stmt->fetch(\PDO::FETCH_ASSOC);

    if (!$row || (int) $row['window_start'] < $windowStart) {
        // New window: reset
        DB->prepare('INSERT OR REPLACE INTO rate_limits (key, hits, window_start) VALUES (?, 1, ?)')->execute([$key, $now]);
        return;
    }

    $hits = (int) $row['hits'];

    if ($hits >= $maxHits) {
        $retryAfter = (int) $row['window_start'] + $windowS - $now;
        header("Retry-After: {$retryAfter}");
        http_response_code(429);
        echo json_encode([
            'status' => 'error',
            'code'   => 'rate_limit_exceeded',
            'retry_after_seconds' => max(0, $retryAfter),
        ]);
        exit;
    }

    DB->prepare('UPDATE rate_limits SET hits = hits + 1 WHERE key = ?')->execute([$key]);
}
