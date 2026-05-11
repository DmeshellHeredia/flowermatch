<?php
/**
 * Invocación del recomendador Python — FlowerMatch
 *
 * Separado de api/recomendar.php para permitir tests unitarios sin servidor.
 *
 * llamarPython() acepta un $ejecutor opcional (callable) para inyectar en tests.
 * Por defecto usa _ejecutarSubproceso(), que lanza el proceso real con proc_open.
 */

require_once __DIR__ . '/recomendador_fallback.php';  // parsearSalidaPython()

/**
 * Intenta obtener una recomendación del script Python.
 * Devuelve null si Python no está disponible, el script no existe, el timeout
 * se supera o la salida no es JSON válido con campo 'intencion'.
 *
 * @param ?callable $ejecutor  fn(array $cmd, float $timeout): ?string
 *                             Inyectado en tests; en producción se usa _ejecutarSubproceso().
 * @param string    $razon     Salida: causa del fallo ('script_no_encontrado', 'timeout',
 *                             'proc_open', 'json_invalido', 'error_subprocess').
 */
function llamarPython(string $consulta, ?callable $ejecutor = null, string &$razon = ''): ?array
{
    $rutaScript = realpath(__DIR__ . '/../../python-ai/recomendador.py');
    if (!$rutaScript) {
        $cLog = mb_substr($consulta, 0, 100) . (mb_strlen($consulta) > 100 ? '…' : '');
        error_log('[req:' . _reqId() . "] [recomendador] script Python no encontrado | consulta=\"{$cLog}\"");
        $razon = 'script_no_encontrado';
        return null;
    }

    $comando = PHP_OS_FAMILY === 'Windows' ? 'python' : 'python3';
    $cmd     = [$comando, $rutaScript, $consulta];

    if ($ejecutor !== null) {
        $stdout = $ejecutor($cmd, 5.0);
        if ($stdout === null) {
            $razon = 'error_subprocess';
            return null;
        }
    } else {
        $stdout = _ejecutarSubproceso($cmd, 5.0, $razon);
        if ($stdout === null) {
            return null;  // $razon ya seteada; detalle ya logueado por _ejecutarSubproceso
        }
    }

    $parsed = parsearSalidaPython($stdout);
    if ($parsed === null) {
        $cLog = mb_substr($consulta, 0, 100) . (mb_strlen($consulta) > 100 ? '…' : '');
        error_log('[req:' . (function_exists('_reqId') ? _reqId() : '-') . '] [recomendador] Python contrato incompleto | consulta="' . $cLog . '" — ' . mb_substr(trim($stdout), 0, 80));
        $razon = 'json_invalido';
    }
    return $parsed;
}

/**
 * Lanza un subproceso y captura su stdout con timeout.
 * stdin se cierra inmediatamente; stderr va solo a error_log.
 * Devuelve stdout como string o null si falla proc_open o se supera el timeout.
 *
 * Nota: expuesta (sin _ privado real) para poder ser testeada directamente
 * usando un subproceso PHP inocuo en lugar de Python.
 *
 * @param array<int,string> $cmd
 * @param string            $razon  Salida: 'timeout' | 'proc_open' cuando retorna null.
 */
function _ejecutarSubproceso(array $cmd, float $timeout, string &$razon = ''): ?string
{
    $proceso = proc_open(
        $cmd,
        [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ],
        $pipes
    );

    if (!is_resource($proceso)) {
        error_log('[req:' . (function_exists('_reqId') ? _reqId() : '-') . '] [recomendador] proc_open falló — ¿Python disponible en PATH?');
        $razon = 'proc_open';
        return null;
    }

    fclose($pipes[0]);

    // Windows: stream_set_blocking always fails for proc_open pipes.
    // Fall back to a simple blocking read (no timeout enforcement).
    $nonBlocking = stream_set_blocking($pipes[1], false)
                && stream_set_blocking($pipes[2], false);

    if (!$nonBlocking) {
        $stdout = (string) stream_get_contents($pipes[1]);
        $stderr = (string) stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        proc_close($proceso);
        if ($stderr !== '') {
            error_log('[req:' . (function_exists('_reqId') ? _reqId() : '-') . '] [recomendador] Python stderr: ' . mb_substr(trim($stderr), 0, 200));
        }
        return $stdout;
    }

    $inicio = microtime(true);
    $stdout = '';
    $stderr = '';

    while (true) {
        $stdout .= (string) fread($pipes[1], 8192);
        $stderr .= (string) fread($pipes[2], 8192);

        $estado = proc_get_status($proceso);

        if (!$estado['running']) {
            $stdout .= (string) stream_get_contents($pipes[1]);
            $stderr .= (string) stream_get_contents($pipes[2]);
            break;
        }

        if (microtime(true) - $inicio >= $timeout) {
            proc_terminate($proceso);
            fclose($pipes[1]);
            fclose($pipes[2]);
            proc_close($proceso);
            error_log('[req:' . _reqId() . "] [recomendador] timeout ({$timeout}s)");
            $razon = 'timeout';
            return null;
        }

        usleep(10_000);
    }

    fclose($pipes[1]);
    fclose($pipes[2]);
    proc_close($proceso);

    if ($stderr !== '') {
        error_log('[req:' . (function_exists('_reqId') ? _reqId() : '-') . '] [recomendador] Python stderr: ' . mb_substr(trim($stderr), 0, 200));
    }

    return $stdout;
}
