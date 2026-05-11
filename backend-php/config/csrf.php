<?php
/**
 * Protección CSRF — double-submit cookie — FlowerMatch
 *
 * Flujo: login emite cookie fm_csrf (no-httpOnly) + valor en body → JS lee la
 * cookie y la envía en X-CSRF-Token → server compara ambos con hash_equals.
 * Solo aplica cuando auth llega por cookie JWT sin header Bearer; con Bearer
 * el navegador no puede enviar headers custom cross-origin sin preflight CORS,
 * así que Bearer ya actúa como anti-CSRF implícito.
 */

function csrf_es_necesario(): bool
{
    $tieneCookie = isset($_COOKIE['fm_token']) && $_COOKIE['fm_token'] !== '';
    $tieneBearer = str_starts_with($_SERVER['HTTP_AUTHORIZATION'] ?? '', 'Bearer ');
    return $tieneCookie && !$tieneBearer;
}

/**
 * Emite cookie fm_csrf no-httpOnly para que JS pueda leerla y enviarla en header.
 * Llamar solo al emitir fm_token (modo JWT). Devuelve el token para incluirlo en body.
 */
function csrf_emitir(int $ttl = 3600): string
{
    $token  = bin2hex(random_bytes(32));
    $secure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on';
    setcookie('fm_csrf', $token, [
        'expires'  => $ttl > 0 ? time() + $ttl : 1,
        'path'     => '/',
        'secure'   => $secure,
        'httponly' => false,          // JS debe leerla para enviarla en X-CSRF-Token
        'samesite' => $secure ? 'None' : 'Lax',
    ]);
    return $token;
}

/**
 * Verifica CSRF en POST/PUT/DELETE cuando la auth es solo por cookie.
 * Seguro para llamar en cualquier endpoint: no hace nada en GET/OPTIONS ni con Bearer.
 */
function csrf_verificar(): void
{
    if (!in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'DELETE'], true)) return;
    if (!csrf_es_necesario()) return;

    $encabezado = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $cookie     = $_COOKIE['fm_csrf']           ?? '';

    if ($cookie === '' || !hash_equals($cookie, $encabezado)) {
        http_response_code(403);
        echo json_encode(['error' => 'CSRF token inválido o ausente']);
        exit;
    }
}
