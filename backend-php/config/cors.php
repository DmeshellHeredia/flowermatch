<?php
/**
 * Cabeceras CORS, seguridad y rate limiting global — FlowerMatch
 */

require_once __DIR__ . '/env.php';

$requestId                 = bin2hex(random_bytes(8));
$GLOBALS['_fm_request_id'] = $requestId;

/** Devuelve el request ID actual para usar en error_log desde cualquier ámbito. */
function _reqId(): string
{
    return $GLOBALS['_fm_request_id'] ?? '-';
}

function _cors_validar_url(string $url): bool
{
    if ($url === '' || $url === '*') return false;
    $esquema = parse_url($url, PHP_URL_SCHEME);
    return $esquema === 'http' || $esquema === 'https';
}

$_envUrl     = $_ENV['FRONTEND_URL'] ?? '';
$frontendUrl = _cors_validar_url($_envUrl) ? $_envUrl : 'http://localhost:3000';

if ($frontendUrl === 'http://localhost:3000' && $_envUrl !== '') {
    $detalle = esModoDesarrollo() ? ' ("' . $_envUrl . '")' : '';
    error_log('[req:' . $requestId . '] FlowerMatch cors: FRONTEND_URL inválido' . $detalle . ', usando fallback');
}

header_remove('X-Powered-By');
header('Access-Control-Allow-Origin: ' . $frontendUrl);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Expose-Headers: X-Request-ID');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-Request-ID: ' . $requestId);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/rate_limit_global.php';

$_rl_grupo = str_contains($_SERVER['REQUEST_URI'] ?? '', '/admin/') ? 'admin' : 'public';
rl_global_verificar($_rl_grupo);
