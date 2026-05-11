<?php
/**
 * Rate limiting global por IP — FlowerMatch
 *
 * Grupos y límites (solicitudes / 60 s):
 *   public  →  120 req
 *   admin   →   60 req
 *
 * El límite de auth (5 fallos / 10 min) lo gestiona api/auth.php por separado.
 * Almacén: backend-php/logs/rate_limit_global.json
 */

define('RL_GLOBAL_ARCHIVO', __DIR__ . '/../logs/rate_limit_global.json');
define('RL_GLOBAL_VENTANA',  60);

const RL_GLOBAL_LIMITES = ['public' => 120, 'admin' => 60];

/**
 * Verifica y registra la solicitud. Responde 429 y termina si se supera el límite.
 * Las entradas expiradas se limpian en cada escritura para evitar crecimiento ilimitado.
 *
 * Lectura y escritura se realizan bajo el mismo flock(LOCK_EX), eliminando la
 * race condition del patrón separado file_get_contents / file_put_contents.
 * Si el archivo no se puede abrir o bloquear, la función retorna sin bloquear
 * (fail-open: preferimos dejar pasar una solicitud a tumbar la API).
 */
function rl_global_verificar(string $grupo = 'public'): void
{
    $limite = RL_GLOBAL_LIMITES[$grupo] ?? 120;
    $ip     = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $ahora  = time();
    $clave  = "$grupo:$ip";

    $dir = dirname(RL_GLOBAL_ARCHIVO);
    if (!is_dir($dir)) @mkdir($dir, 0750, true);

    $fh = @fopen(RL_GLOBAL_ARCHIVO, 'c+');
    if ($fh === false) return;

    if (!flock($fh, LOCK_EX)) {
        fclose($fh);
        return;
    }

    $raw   = stream_get_contents($fh);
    $datos = ($raw !== false && $raw !== '') ? json_decode($raw, true) : null;
    if (!is_array($datos)) $datos = [];

    // Purgar entradas más antiguas que 2 ventanas (incluye entradas malformadas)
    foreach ($datos as $k => $r) {
        if (!isset($r['inicio']) || $ahora - $r['inicio'] > RL_GLOBAL_VENTANA * 2) {
            unset($datos[$k]);
        }
    }

    $r = $datos[$clave] ?? null;

    if ($r === null || $ahora - $r['inicio'] >= RL_GLOBAL_VENTANA) {
        $datos[$clave] = ['inicio' => $ahora, 'total' => 1];
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, json_encode($datos));
        flock($fh, LOCK_UN);
        fclose($fh);
        return;
    }

    if ($r['total'] >= $limite) {
        $espera = max(1, ($r['inicio'] + RL_GLOBAL_VENTANA) - $ahora);
        flock($fh, LOCK_UN);
        fclose($fh);
        $req = function_exists('_reqId') ? _reqId() : '-';
        error_log('[req:' . $req . '] [rate-limit] 429 grupo=' . $grupo . ' ip=' . $ip . ' retry-after=' . $espera . 's');
        header("Retry-After: $espera");
        http_response_code(429);
        echo json_encode(['error' => 'Demasiadas solicitudes. Intenta más tarde.']);
        exit;
    }

    $datos[$clave]['total']++;
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($datos));
    flock($fh, LOCK_UN);
    fclose($fh);
}
