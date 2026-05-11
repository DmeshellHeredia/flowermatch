<?php
/**
 * GET /api/health.php — Healthcheck del sistema — FlowerMatch
 *
 * 200 → { "status": "ok",   "checks": { "mysql": "ok"    } }
 * 503 → { "status": "error", "checks": { "mysql": "error" } }
 */

require_once '../config/cors.php';
require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido. Use GET.']);
    exit;
}

$checks = [];

try {
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s;connect_timeout=3',
        DB_SERVIDOR, DB_NOMBRE, DB_CHARSET
    );
    $pdo = new PDO($dsn, DB_USUARIO, DB_CONTRASENA, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $pdo->query('SELECT 1');
    $checks['mysql'] = 'ok';
} catch (Throwable $e) {
    $checks['mysql'] = 'error';
    error_log('[req:' . _reqId() . '] [health] MySQL no disponible: ' . $e->getMessage());
}

$ok = !in_array('error', $checks, true);

http_response_code($ok ? 200 : 503);
echo json_encode(['status' => $ok ? 'ok' : 'error', 'checks' => $checks]);
