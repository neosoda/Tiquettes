<?php

/**
 * JWT middleware — validates RS256 access tokens for protected routes.
 *
 * Usage:
 *   require_once __DIR__ . '/../libs/jwt_middleware.php';
 *   $userId = require_jwt();   // exits with 401 if invalid
 *
 * Keys:
 *   - Private key : JWT_PRIVATE_KEY env var (PEM, for auth/login.php + auth/refresh.php)
 *   - Public key  : JWT_PUBLIC_KEY env var  (PEM, for all protected routes)
 *
 * Token payload: { sub: userId, plan: 'free|pro|enterprise', exp: timestamp }
 */

declare(strict_types=1);

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\SignatureInvalidException;

require_once __DIR__ . '/../../vendor/autoload.php';

const JWT_ALGORITHM = 'RS256';
const ACCESS_TOKEN_TTL = 900; // 15 minutes

/**
 * Extract and validate the Bearer token from Authorization header.
 * Returns the userId (sub claim) on success, exits 401 on failure.
 *
 * @return string userId
 */
function require_jwt(): string
{
    $publicKey = trim((string) (getenv('JWT_PUBLIC_KEY') ?: ''));
    if ($publicKey === '') {
        http_response_code(503);
        echo json_encode(['status' => 'error', 'code' => 'auth_not_configured']);
        exit;
    }

    $header = trim((string) ($_SERVER['HTTP_AUTHORIZATION'] ?? ''));
    if (!str_starts_with($header, 'Bearer ')) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'code' => 'missing_token']);
        exit;
    }

    $token = substr($header, 7);

    try {
        $decoded = JWT::decode($token, new Key($publicKey, JWT_ALGORITHM));
        return (string) ($decoded->sub ?? '');
    } catch (ExpiredException) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'code' => 'token_expired']);
        exit;
    } catch (SignatureInvalidException) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'code' => 'token_invalid']);
        exit;
    } catch (\Throwable) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'code' => 'token_invalid']);
        exit;
    }
}

/**
 * Generate a signed access token.
 * Only called from auth endpoints — requires JWT_PRIVATE_KEY.
 *
 * @param string $userId
 * @param string $plan
 * @return string signed JWT
 */
function generate_access_token(string $userId, string $plan): string
{
    $privateKey = trim((string) (getenv('JWT_PRIVATE_KEY') ?: ''));
    if ($privateKey === '') {
        throw new \RuntimeException('JWT_PRIVATE_KEY not configured');
    }

    $now = time();
    return JWT::encode([
        'iss' => 'vpanel',
        'sub' => $userId,
        'plan' => $plan,
        'iat' => $now,
        'exp' => $now + ACCESS_TOKEN_TTL,
    ], $privateKey, JWT_ALGORITHM);
}
