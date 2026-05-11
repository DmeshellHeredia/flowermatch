<?php
/**
 * POST /api/recomendar.php — Body: { "consulta": "..." }
 *
 * Intenta Python primero (TF-IDF, modo "python-nlp"); si falla o supera 5 s,
 * cae al fallback PHP (modo "php-reglas"). Ambos leen shared/recomendador/*.json.
 * El tercer nivel de fallback (modo "local") lo maneja el frontend directamente.
 */

require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../config/recomendador_fallback.php';
require_once '../config/recomendar_python.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido. Use POST.']);
    exit;
}

$cuerpo   = json_decode(file_get_contents('php://input'), true);
$consulta = trim($cuerpo['consulta'] ?? '');

if ($consulta === '') {
    http_response_code(400);
    echo json_encode(['error' => 'La consulta no puede estar vacía']);
    exit;
}

if (mb_strlen($consulta) > 500) {
    http_response_code(400);
    echo json_encode(['error' => 'Consulta demasiado larga (máx 500 caracteres)']);
    exit;
}

$razon     = '';
$inicio    = microtime(true);
$resultado = llamarPython($consulta, null, $razon);
$ms        = (int) round((microtime(true) - $inicio) * 1000);

if ($resultado !== null) {
    if ($resultado['degradado'] ?? false) {
        error_log('[req:' . _reqId() . "] [recomendador] python-nlp degradado: MySQL no disponible en Python ({$ms}ms)");
    }
    registrarConsulta($consulta, $resultado, null);
    echo json_encode($resultado, JSON_UNESCAPED_UNICODE);
} else {
    $cLog = mb_substr($consulta, 0, 100) . (mb_strlen($consulta) > 100 ? '…' : '');
    if ($razon === 'script_no_encontrado') {
        error_log('[req:' . _reqId() . "] [recomendador] fallback esperado — Python no instalado ({$ms}ms) | consulta=\"{$cLog}\"");
    } else {
        $detalle = match ($razon) {
            'timeout'          => 'timeout',
            'proc_open'        => 'proc_open falló',
            'json_invalido'    => 'JSON inválido',
            'error_subprocess' => 'error en subproceso',
            default            => $razon ?: 'causa desconocida',
        };
        error_log('[req:' . _reqId() . "] [recomendador] fallback por error: {$detalle} ({$ms}ms) | consulta=\"{$cLog}\"");
    }
    $pdo      = obtenerConexion();
    $fallback = recomendarConPHP($consulta, $pdo);
    registrarConsulta($consulta, $fallback, $pdo);
    echo json_encode($fallback, JSON_UNESCAPED_UNICODE);
}

/* ------------------------------------------------------------------ */

function registrarConsulta(string $consulta, array $resultado, ?PDO $pdo): void
{
    try {
        $pdo          ??= obtenerConexion();
        $nombresFlores = array_column($resultado['flores'] ?? [], 'nombre');
        $stmt         = $pdo->prepare('
            INSERT INTO registro_recomendaciones (consulta, intencion_detectada, flores_sugeridas, modo)
            VALUES (?, ?, ?, ?)
        ');
        $stmt->execute([
            $consulta,
            $resultado['intencion'] ?? '',
            json_encode($nombresFlores, JSON_UNESCAPED_UNICODE),
            $resultado['modo']        ?? '',
        ]);
    } catch (Throwable $e) {
        error_log('[req:' . _reqId() . '] [recomendador] error al registrar consulta: ' . $e->getMessage());
    }
}
