<?php
/**
 * JWT HS256 sin dependencias externas — FlowerMatch
 */

function _jwt_b64u_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function _jwt_b64u_decode(string $data): string
{
    $pad  = strlen($data) % 4;
    $data = $pad ? $data . str_repeat('=', 4 - $pad) : $data;
    return base64_decode(strtr($data, '-_', '+/'));
}

/**
 * Crea un JWT firmado con HS256.
 * @param array<string,mixed> $claims
 */
function jwt_crear(array $claims, string $secret): string
{
    $header  = _jwt_b64u_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = _jwt_b64u_encode(json_encode($claims));
    $firma   = _jwt_b64u_encode(hash_hmac('sha256', "$header.$payload", $secret, true));
    return "$header.$payload.$firma";
}

/**
 * Verifica un JWT. Devuelve claims si es válido y no expiró; false en cualquier otro caso.
 * @return array<string,mixed>|false
 */
function jwt_verificar(string $token, string $secret): array|false
{
    $partes = explode('.', $token);
    if (count($partes) !== 3) return false;

    [$header, $payload, $firma] = $partes;

    // Rechazar alg confusion: solo HS256 aceptado
    $headerData = json_decode(_jwt_b64u_decode($header), true);
    if (!is_array($headerData) || ($headerData['alg'] ?? '') !== 'HS256') return false;

    $firmaEsperada = _jwt_b64u_encode(hash_hmac('sha256', "$header.$payload", $secret, true));
    if (!hash_equals($firmaEsperada, $firma)) return false;

    $claims = json_decode(_jwt_b64u_decode($payload), true);
    if (!is_array($claims)) return false;

    if (!isset($claims['exp']) || $claims['exp'] < time()) return false;
    if (isset($claims['sub']) && $claims['sub'] !== 'admin') return false;

    return $claims;
}

/**
 * Opciones de setcookie() adaptadas al entorno.
 * HTTPS → SameSite=None; Secure  (cross-origin en producción).
 * HTTP  → SameSite=Lax           (desarrollo local; solo funciona same-origin).
 */
function jwt_opciones_cookie(int $ttl = 3600): array
{
    $secure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on';
    return [
        'expires'  => $ttl > 0 ? time() + $ttl : 1,
        'path'     => '/',
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => $secure ? 'None' : 'Lax',
    ];
}
