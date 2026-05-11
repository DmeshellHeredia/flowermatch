<?php
/**
 * Endpoint admin de flores - FlowerMatch
 *
 * GET    /api/admin/flores.php         -> Lista todas las flores (incluye disponible=0)
 * DELETE /api/admin/flores.php?id=X   -> Elimina definitivamente una flor (hard delete)
 *
 * Requiere: Authorization: Bearer <ADMIN_TOKEN>
 */

require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../config/auth.php';
require_once '../../config/validacion.php';
require_once '../../config/csrf.php';

$metodo = $_SERVER['REQUEST_METHOD'];

$id = null;
if (isset($_GET['id'])) {
    $id = validarIdParam($_GET['id']);
    if ($id === false) {
        http_response_code(400);
        echo json_encode(['error' => 'El parámetro id debe ser un entero mayor que 0']);
        exit;
    }
}

verificarToken();
csrf_verificar();

try {
    $pdo = obtenerConexion();

    switch ($metodo) {

        case 'GET':
            $condiciones = [];
            $parametros  = [];

            if (isset($_GET['busqueda']) && $_GET['busqueda'] !== '') {
                $busqueda = validarBusqueda($_GET['busqueda']);
                if ($busqueda === false) {
                    http_response_code(400);
                    echo json_encode(['error' => 'busqueda debe tener máximo 200 caracteres']);
                    exit;
                }
                $condiciones[] = '(nombre LIKE ? OR descripcion LIKE ?)';
                $termino       = '%' . $busqueda . '%';
                $parametros[]  = $termino;
                $parametros[]  = $termino;
            }

            if (isset($_GET['color']) && $_GET['color'] !== '') {
                $color = validarColor($_GET['color']);
                if ($color === false) {
                    http_response_code(400);
                    echo json_encode(['error' => 'color inválido', 'validos' => COLORES_VALIDOS]);
                    exit;
                }
                $condiciones[] = 'color = ?';
                $parametros[]  = $color;
            }

            if (isset($_GET['ocasion']) && $_GET['ocasion'] !== '') {
                $ocasion = validarBusqueda($_GET['ocasion']);
                if ($ocasion === false) {
                    http_response_code(400);
                    echo json_encode(['error' => 'ocasion debe tener máximo 200 caracteres']);
                    exit;
                }
                $condiciones[] = 'LOWER(ocasion) LIKE ?';
                $parametros[]  = '%' . strtolower($ocasion) . '%';
            }

            if (isset($_GET['orden']) && $_GET['orden'] !== '') {
                $orden = validarOrden($_GET['orden']);
                if ($orden === false) {
                    http_response_code(400);
                    echo json_encode([
                        'error'   => 'orden inválido',
                        'validos' => ['nombre', 'precio_asc', 'precio_desc'],
                    ]);
                    exit;
                }
            } else {
                $orden = 'nombre ASC';
            }

            $where = empty($condiciones) ? '' : 'WHERE ' . implode(' AND ', $condiciones);
            $sql   = "SELECT * FROM flores $where ORDER BY $orden";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($parametros);
            echo json_encode($stmt->fetchAll(), JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'Se requiere el ID en la URL']);
                exit;
            }

            $soft = false;
            if (isset($_GET['soft'])) {
                if ($_GET['soft'] !== '1') {
                    http_response_code(400);
                    echo json_encode(['error' => 'El parámetro soft solo acepta el valor "1"']);
                    exit;
                }
                $soft = true;
            }

            $chk = $pdo->prepare('SELECT id FROM flores WHERE id = ?');
            $chk->execute([$id]);
            if (!$chk->fetch()) {
                http_response_code(404);
                echo json_encode(['error' => 'Flor no encontrada']);
                exit;
            }

            if ($soft) {
                $stmt = $pdo->prepare('UPDATE flores SET disponible = 0 WHERE id = ?');
                $stmt->execute([$id]);
                echo json_encode(['mensaje' => 'Flor ocultada del catálogo']);
            } else {
                $stmt = $pdo->prepare('DELETE FROM flores WHERE id = ?');
                $stmt->execute([$id]);
                echo json_encode(['mensaje' => 'Flor eliminada definitivamente']);
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(['error' => 'Método no permitido']);
    }

} catch (Throwable $e) {
    $detalle = esModoDesarrollo() ? ' — ' . $e->getMessage() : ' [' . get_class($e) . ':' . $e->getCode() . ']';
    error_log('[req:' . _reqId() . '] FlowerMatch admin/flores.php' . $detalle);
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}
