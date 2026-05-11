<?php
/**
 * Verificación de token para endpoints protegidos — FlowerMatch
 *
 * JWT_SECRET configurado  →  producción: emite y verifica JWT HS256 (1 h).
 * Solo ADMIN_TOKEN        →  desarrollo: token estático sin expiración.
 *
 * Orden de verificación (el primero que pase gana):
 *   1. Cookie httpOnly 'fm_token'  — JWT vía cookie (producción, HTTPS)
 *   2. Authorization: Bearer <jwt> — JWT vía header (curl, Postman, cross-origin dev)
 *   3. Authorization: Bearer <tok> — token estático ADMIN_TOKEN (dev sin JWT_SECRET)
 */

require_once __DIR__ . '/env.php';
require_once __DIR__ . '/jwt.php';

function verificarToken(): void
{
    $jwtSecret     = $_ENV['JWT_SECRET']  ?? '';
    $tokenEstatico = $_ENV['ADMIN_TOKEN'] ?? '';

    // Producción: JWT
    if ($jwtSecret !== '') {
        // 1. Cookie httpOnly (navegador en producción HTTPS)
        $cookie = $_COOKIE['fm_token'] ?? '';
        if ($cookie !== '' && jwt_verificar($cookie, $jwtSecret) !== false) {
            return;
        }

        // 2. Bearer JWT (curl, Postman, frontend cross-origin en dev)
        $cabecera = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (str_starts_with($cabecera, 'Bearer ')) {
            $bearer = substr($cabecera, 7);
            if ($bearer !== '' && jwt_verificar($bearer, $jwtSecret) !== false) {
                return;
            }
        }
    }

    // Desarrollo: token estático (solo si JWT_SECRET no está configurado)
    if ($tokenEstatico !== '') {
        $cabecera = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (str_starts_with($cabecera, 'Bearer ')) {
            $bearer = substr($cabecera, 7);
            if (hash_equals($tokenEstatico, $bearer)) {
                return;
            }
        }
    }

    http_response_code(401);
    echo json_encode(['error' => 'No autorizado']);
    exit;
}
