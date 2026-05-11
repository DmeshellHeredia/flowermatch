<?php
/**
 * Endpoint de autenticación con rate limiting — FlowerMatch
 *
 * POST /api/auth.php
 *   Con JWT_SECRET: emite JWT en cookie httpOnly, devuelve { modo:"jwt", csrf_token }.
 *     El JWT NO se incluye en el body; el frontend usa la cookie directamente.
 *   Sin JWT_SECRET: devuelve { modo:"token", token } con el ADMIN_TOKEN estático.
 *
 * Rate limiting: máx. 5 intentos fallidos por IP en ventana de 10 minutos.
 * Almacén: backend-php/logs/login_attempts.json (ignorado por git).
 */

require_once '../config/cors.php';
require_once '../config/env.php';
require_once '../config/jwt.php';
require_once '../config/csrf.php';

define('RL_VENTANA',  600);
define('RL_MAX',        5);
define('RL_ARCHIVO', __DIR__ . '/../logs/login_attempts.json');

function estaBloqueado(array $registros, string $ip, int $ahora, int $ventana = RL_VENTANA, int $max = RL_MAX): bool
{
    if (!isset($registros[$ip])) return false;
    $e = $registros[$ip];
    if ($ahora - $e['primer_intento'] >= $ventana) return false;
    return $e['intentos'] >= $max;
}

function registrarFallo(array $registros, string $ip, int $ahora, int $ventana = RL_VENTANA): array
{
    if (!isset($registros[$ip]) || $ahora - $registros[$ip]['primer_intento'] >= $ventana) {
        $registros[$ip] = ['intentos' => 1, 'primer_intento' => $ahora];
    } else {
        $registros[$ip]['intentos']++;
    }
    return $registros;
}

function limpiarIP(array $registros, string $ip): array
{
    unset($registros[$ip]);
    return $registros;
}

function purgarExpirados(array $registros, int $ahora, int $ventana = RL_VENTANA): array
{
    foreach ($registros as $ip => $e) {
        if ($ahora - $e['primer_intento'] >= $ventana) {
            unset($registros[$ip]);
        }
    }
    return $registros;
}

/**
 * Lee el archivo de intentos bajo flock(LOCK_EX). Devuelve array o false si no disponible.
 * false → fail-closed (el llamador debe bloquear el login).
 * El lock se libera antes de retornar: la operación de lectura no bloquea el archivo
 * durante el intento de login (que incluye password_verify, intencionalmente lento).
 */
function rl_leer_con_lock(): array|false
{
    $dir = dirname(RL_ARCHIVO);
    if (!is_dir($dir)) @mkdir($dir, 0750, true);

    $fh = @fopen(RL_ARCHIVO, 'c+');
    if ($fh === false) {
        error_log('[req:' . _reqId() . '] [auth] rate limiting no disponible — no se pudo abrir ' . RL_ARCHIVO);
        return false;
    }

    if (!flock($fh, LOCK_EX)) {
        fclose($fh);
        error_log('[req:' . _reqId() . '] [auth] rate limiting no disponible — flock falló en lectura');
        return false;
    }

    $raw   = stream_get_contents($fh);
    $datos = ($raw !== false && $raw !== '') ? json_decode($raw, true) : null;
    if (!is_array($datos)) {
        if ($raw !== false && $raw !== '') {
            error_log('[req:' . _reqId() . '] [auth] login_attempts.json corrupto — se reinicia');
        }
        $datos = [];
    }

    flock($fh, LOCK_UN);
    fclose($fh);

    return $datos;
}

/**
 * Abre el archivo bajo flock(LOCK_EX), re-lee el estado actual, aplica $fn(array): array,
 * y escribe el resultado. Devuelve los datos resultantes o false si falla cualquier paso.
 *
 * Re-leer dentro del lock elimina la race condition entre la lectura previa (rl_leer_con_lock)
 * y esta escritura: el contador siempre refleja la suma de todos los intentos concurrentes.
 */
function rl_modificar_con_lock(callable $fn): array|false
{
    $dir = dirname(RL_ARCHIVO);
    if (!is_dir($dir) && !@mkdir($dir, 0750, true)) {
        error_log('[req:' . _reqId() . '] [auth] rate limiting no disponible — no se pudo crear ' . $dir);
        return false;
    }

    $fh = @fopen(RL_ARCHIVO, 'c+');
    if ($fh === false) {
        error_log('[req:' . _reqId() . '] [auth] rate limiting no disponible — no se pudo abrir ' . RL_ARCHIVO);
        return false;
    }

    if (!flock($fh, LOCK_EX)) {
        fclose($fh);
        error_log('[req:' . _reqId() . '] [auth] rate limiting no disponible — flock falló en escritura');
        return false;
    }

    $raw   = stream_get_contents($fh);
    $datos = ($raw !== false && $raw !== '') ? json_decode($raw, true) : null;
    if (!is_array($datos)) {
        if ($raw !== false && $raw !== '') {
            error_log('[req:' . _reqId() . '] [auth] login_attempts.json corrupto — se reinicia');
        }
        $datos = [];
    }

    $datos = $fn($datos);

    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($datos));
    fflush($fh);
    flock($fh, LOCK_UN);
    fclose($fh);

    return $datos;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

$ip    = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$ahora = time();

$registros = rl_leer_con_lock();

if ($registros === false) {
    // No se puede verificar el estado de bloqueo → fail-closed
    error_log('[req:' . _reqId() . '] [auth] rate limiting no disponible — login bloqueado por seguridad');
    http_response_code(503);
    echo json_encode(['error' => 'Servicio temporalmente no disponible. Intenta más tarde.']);
    exit;
}

if (estaBloqueado($registros, $ip, $ahora)) {
    http_response_code(429);
    echo json_encode(['error' => 'Demasiados intentos. Intenta más tarde.']);
    exit;
}

$datos    = json_decode(file_get_contents('php://input'), true);
$usuario  = $datos['usuario']  ?? '';
$password = $datos['password'] ?? '';

$adminUser = $_ENV['ADMIN_USER']          ?? '';
$adminHash = $_ENV['ADMIN_PASSWORD_HASH'] ?? '';

if (
    $adminUser === '' ||
    $adminHash === '' ||
    !hash_equals($adminUser, $usuario) ||
    !password_verify($password, $adminHash)
) {
    $resultado = rl_modificar_con_lock(function (array $reg) use ($ip, $ahora): array {
        $reg = purgarExpirados($reg, $ahora);
        return registrarFallo($reg, $ip, $ahora);
    });
    if ($resultado === false) {
        // No se puede registrar el fallo → el próximo intento no lo verá → fail-closed
        error_log('[req:' . _reqId() . '] [auth] rate limiting no disponible — login bloqueado por fallo de escritura');
        http_response_code(503);
        echo json_encode(['error' => 'Servicio temporalmente no disponible. Intenta más tarde.']);
        exit;
    }
    http_response_code(401);
    echo json_encode(['error' => 'Credenciales incorrectas']);
    exit;
}

// Limpieza tras login exitoso: best-effort (no bloquear un login correcto por esto)
rl_modificar_con_lock(function (array $reg) use ($ip, $ahora): array {
    $reg = limpiarIP($reg, $ip);
    return purgarExpirados($reg, $ahora);
});

$jwtSecret  = $_ENV['JWT_SECRET']   ?? '';
$adminToken = $_ENV['ADMIN_TOKEN']  ?? '';
$ttl        = 3600;

if ($jwtSecret !== '') {
    // JWT va solo en cookie httpOnly; no se expone en el body para evitar XSS vía localStorage
    $token = jwt_crear([
        'sub' => 'admin',
        'iat' => $ahora,
        'exp' => $ahora + $ttl,
    ], $jwtSecret);
    setcookie('fm_token', $token, jwt_opciones_cookie($ttl));
    $csrfToken = csrf_emitir($ttl);
    echo json_encode(['modo' => 'jwt', 'csrf_token' => $csrfToken]);
} elseif ($adminToken !== '') {
    echo json_encode(['modo' => 'token', 'token' => $adminToken]);
} else {
    $detalle = esModoDesarrollo() ? ' — JWT_SECRET y ADMIN_TOKEN no configurados' : '';
    error_log('[req:' . _reqId() . '] FlowerMatch auth: sin token configurado' . $detalle);
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
    exit;
}
