<?php
/**
 * Configuración de conexión a la base de datos - FlowerMatch
 */

require_once __DIR__ . '/env.php';

define('DB_SERVIDOR',   $_ENV['DB_HOST']     ?? '127.0.0.1');
define('DB_USUARIO',    $_ENV['DB_USER']     ?? 'root');
define('DB_CONTRASENA', $_ENV['DB_PASSWORD'] ?? '');
define('DB_NOMBRE',     $_ENV['DB_NAME']     ?? 'flowermatch');
define('DB_CHARSET',    $_ENV['DB_CHARSET']  ?? 'utf8mb4');

function obtenerConexion(): PDO
{
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        DB_SERVIDOR,
        DB_NOMBRE,
        DB_CHARSET
    );

    $opciones = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        return new PDO($dsn, DB_USUARIO, DB_CONTRASENA, $opciones);
    } catch (PDOException $excepcion) {
        // En producción no logueamos el mensaje completo: puede contener
        // usuario y host ("Access denied for user 'x'@'y'").
        $detalle = esModoDesarrollo() ? ' — ' . $excepcion->getMessage() : ' [' . $excepcion->getCode() . ']';
        $req     = function_exists('_reqId') ? _reqId() : '-';
        error_log('[req:' . $req . '] FlowerMatch DB: conexión fallida' . $detalle);
        http_response_code(500);
        echo json_encode(['error' => 'Error interno del servidor']);
        exit;
    }
}
