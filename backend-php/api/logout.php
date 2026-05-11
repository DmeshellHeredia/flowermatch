<?php
/**
 * Endpoint de cierre de sesión — FlowerMatch
 * POST /api/logout.php → invalida la cookie httpOnly del JWT
 */

require_once '../config/cors.php';
require_once '../config/jwt.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

$secure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on';

setcookie('fm_token', '', jwt_opciones_cookie(-1));
// fm_csrf es non-httpOnly; expirarlo aquí para que JS no detecte sesión fantasma
setcookie('fm_csrf', '', [
    'expires'  => 1,
    'path'     => '/',
    'secure'   => $secure,
    'httponly' => false,
    'samesite' => $secure ? 'None' : 'Lax',
]);

echo json_encode(['ok' => true]);
