<?php
/**
 * API REST de flores - FlowerMatch
 *
 * GET    /api/flores.php          -> Lista flores (con filtros opcionales)
 * GET    /api/flores.php?id=X     -> Obtiene una flor
 * POST   /api/flores.php          -> Crea una flor
 * PUT    /api/flores.php?id=X     -> Actualiza una flor
 * DELETE /api/flores.php?id=X     -> Oculta una flor del catálogo (soft delete, disponible=0)
 */

require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../config/auth.php';
require_once '../config/validacion.php';
require_once '../config/csrf.php';

csrf_verificar();

$metodo = $_SERVER['REQUEST_METHOD'];

// Valida ?id= si está presente — rechaza antes de llegar al switch
$id = null;
if (isset($_GET['id'])) {
    $id = validarIdParam($_GET['id']);
    if ($id === false) {
        http_response_code(400);
        echo json_encode(['error' => 'El parámetro id debe ser un entero mayor que 0']);
        exit;
    }
}

try {
    $pdo = obtenerConexion();

    switch ($metodo) {

        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare('SELECT * FROM flores WHERE id = ? AND disponible = 1');
                $stmt->execute([$id]);
                $flor = $stmt->fetch();
                if (!$flor) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Flor no encontrada']);
                } else {
                    $razon = validarFlorIntegridad($flor);
                    if ($razon !== null) {
                        error_log('[req:' . _reqId() . "] [flores] flor inválida id={$flor['id']} razón={$razon}");
                        http_response_code(404);
                        echo json_encode(['error' => 'Flor no encontrada']);
                    } else {
                        echo json_encode($flor);
                    }
                }
            } else {
                $condiciones = ['disponible = 1'];
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
                        echo json_encode([
                            'error'   => 'color inválido',
                            'validos' => COLORES_VALIDOS,
                        ]);
                        exit;
                    }
                    $condiciones[] = 'color = ?';
                    $parametros[]  = $color;
                }

                if (isset($_GET['ocasion']) && $_GET['ocasion'] !== '') {
                    $ocasion = validarBusqueda($_GET['ocasion']); // misma regla: max 200, no tags
                    if ($ocasion === false) {
                        http_response_code(400);
                        echo json_encode(['error' => 'ocasion debe tener máximo 200 caracteres']);
                        exit;
                    }
                    $condiciones[] = 'LOWER(ocasion) LIKE ?';
                    $parametros[]  = '%' . strtolower($ocasion) . '%';
                }

                $precioMinVal = null;
                if (isset($_GET['precio_min']) && $_GET['precio_min'] !== '') {
                    $precioMinVal = validarPrecioFiltro($_GET['precio_min']);
                    if ($precioMinVal === false) {
                        http_response_code(400);
                        echo json_encode(['error' => 'precio_min debe ser un número entre 0 y ' . PRECIO_FILTRO_MAX]);
                        exit;
                    }
                    $condiciones[] = 'precio >= ?';
                    $parametros[]  = $precioMinVal;
                }

                $precioMaxVal = null;
                if (isset($_GET['precio_max']) && $_GET['precio_max'] !== '') {
                    $precioMaxVal = validarPrecioFiltro($_GET['precio_max']);
                    if ($precioMaxVal === false) {
                        http_response_code(400);
                        echo json_encode(['error' => 'precio_max debe ser un número entre 0 y ' . PRECIO_FILTRO_MAX]);
                        exit;
                    }
                    $condiciones[] = 'precio <= ?';
                    $parametros[]  = $precioMaxVal;
                }

                if ($precioMinVal !== null && $precioMaxVal !== null && $precioMinVal > $precioMaxVal) {
                    http_response_code(400);
                    echo json_encode(['error' => 'precio_min no puede ser mayor que precio_max']);
                    exit;
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

                $page  = 1;
                $limit = 20;

                if (isset($_GET['page']) && $_GET['page'] !== '') {
                    $page = filter_var($_GET['page'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
                    if ($page === false) {
                        http_response_code(400);
                        echo json_encode(['error' => 'page debe ser un entero mayor que 0']);
                        exit;
                    }
                }

                if (isset($_GET['limit']) && $_GET['limit'] !== '') {
                    $limit = filter_var($_GET['limit'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 100]]);
                    if ($limit === false) {
                        http_response_code(400);
                        echo json_encode(['error' => 'limit debe ser un entero entre 1 y 100']);
                        exit;
                    }
                }

                $offset = ($page - 1) * $limit;
                $where  = 'WHERE ' . implode(' AND ', $condiciones);

                $countStmt = $pdo->prepare("SELECT COUNT(*) FROM flores $where");
                $countStmt->execute($parametros);
                $total = (int) $countStmt->fetchColumn();

                $sql  = "SELECT * FROM flores $where ORDER BY $orden LIMIT $limit OFFSET $offset";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($parametros);

                $flores = filtrarFloresValidas($stmt->fetchAll(), function (array $flor, string $razon): void {
                    error_log('[req:' . _reqId() . "] [flores] flor inválida excluida id={$flor['id']} razón={$razon}");
                });
                echo json_encode([
                    'data'        => $flores,
                    'total'       => $total,
                    'page'        => $page,
                    'limit'       => $limit,
                    'total_pages' => (int) ceil($total / $limit),
                ]);
            }
            break;

        case 'POST':
            verificarToken();
            $datos = json_decode(file_get_contents('php://input'), true);

            if (!is_array($datos)) {
                http_response_code(400);
                echo json_encode(['error' => 'Body JSON inválido']);
                exit;
            }

            $nombre = validarNombre($datos['nombre'] ?? null);
            if ($nombre === false) {
                http_response_code(400);
                echo json_encode(['error' => 'nombre es requerido (máx 100 caracteres)']);
                exit;
            }

            $color = validarColor($datos['color'] ?? null);
            if ($color === false) {
                http_response_code(400);
                echo json_encode(['error' => 'color inválido', 'validos' => COLORES_VALIDOS]);
                exit;
            }

            $ocasion = validarOcasion($datos['ocasion'] ?? null);
            if ($ocasion === false) {
                http_response_code(400);
                echo json_encode(['error' => 'ocasion es requerida (máx 200 caracteres)']);
                exit;
            }

            $precio = validarPrecio($datos['precio'] ?? null);
            if ($precio === false) {
                http_response_code(400);
                echo json_encode(['error' => 'precio debe ser un número mayor que 0']);
                exit;
            }

            $descripcion = validarDescripcion($datos['descripcion'] ?? '');
            if ($descripcion === false) {
                http_response_code(400);
                echo json_encode(['error' => 'descripcion debe tener máximo 1000 caracteres']);
                exit;
            }

            $imagen = validarImagen($datos['imagen'] ?? '');
            if ($imagen === false) {
                http_response_code(400);
                echo json_encode(['error' => 'imagen inválida (máx 255 caracteres, sin rutas relativas)']);
                exit;
            }

            $disponible = isset($datos['disponible']) ? ($datos['disponible'] ? 1 : 0) : 1;

            $stmt = $pdo->prepare('
                INSERT INTO flores (nombre, color, ocasion, precio, descripcion, imagen, disponible)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([$nombre, $color, $ocasion, $precio, $descripcion, $imagen, $disponible]);

            $nuevoId = $pdo->lastInsertId();
            $stmt    = $pdo->prepare('SELECT * FROM flores WHERE id = ?');
            $stmt->execute([$nuevoId]);

            http_response_code(201);
            echo json_encode($stmt->fetch());
            break;

        case 'PUT':
            verificarToken();
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'Se requiere el ID de la flor en la URL']);
                exit;
            }

            $datos = json_decode(file_get_contents('php://input'), true);

            if (!is_array($datos)) {
                http_response_code(400);
                echo json_encode(['error' => 'Body JSON inválido']);
                exit;
            }

            $campos  = [];
            $valores = [];

            if (array_key_exists('nombre', $datos)) {
                $v = validarNombre($datos['nombre']);
                if ($v === false) {
                    http_response_code(400);
                    echo json_encode(['error' => 'nombre inválido (máx 100 caracteres)']);
                    exit;
                }
                $campos[]  = 'nombre = ?';
                $valores[] = $v;
            }

            if (array_key_exists('color', $datos)) {
                $v = validarColor($datos['color']);
                if ($v === false) {
                    http_response_code(400);
                    echo json_encode(['error' => 'color inválido', 'validos' => COLORES_VALIDOS]);
                    exit;
                }
                $campos[]  = 'color = ?';
                $valores[] = $v;
            }

            if (array_key_exists('ocasion', $datos)) {
                $v = validarOcasion($datos['ocasion']);
                if ($v === false) {
                    http_response_code(400);
                    echo json_encode(['error' => 'ocasion inválida (máx 200 caracteres)']);
                    exit;
                }
                $campos[]  = 'ocasion = ?';
                $valores[] = $v;
            }

            if (array_key_exists('precio', $datos)) {
                $v = validarPrecio($datos['precio']);
                if ($v === false) {
                    http_response_code(400);
                    echo json_encode(['error' => 'precio debe ser un número mayor que 0']);
                    exit;
                }
                $campos[]  = 'precio = ?';
                $valores[] = $v;
            }

            if (array_key_exists('descripcion', $datos)) {
                $v = validarDescripcion($datos['descripcion']);
                if ($v === false) {
                    http_response_code(400);
                    echo json_encode(['error' => 'descripcion debe tener máximo 1000 caracteres']);
                    exit;
                }
                $campos[]  = 'descripcion = ?';
                $valores[] = $v;
            }

            if (array_key_exists('imagen', $datos)) {
                $v = validarImagen($datos['imagen']);
                if ($v === false) {
                    http_response_code(400);
                    echo json_encode(['error' => 'imagen inválida (máx 255 caracteres, sin rutas relativas)']);
                    exit;
                }
                $campos[]  = 'imagen = ?';
                $valores[] = $v;
            }

            if (array_key_exists('disponible', $datos)) {
                $campos[]  = 'disponible = ?';
                $valores[] = $datos['disponible'] ? 1 : 0;
            }

            if (empty($campos)) {
                http_response_code(400);
                echo json_encode(['error' => 'No se proporcionaron campos para actualizar']);
                exit;
            }

            $valores[] = $id;
            $stmt = $pdo->prepare('UPDATE flores SET ' . implode(', ', $campos) . ' WHERE id = ?');
            $stmt->execute($valores);

            $stmt = $pdo->prepare('SELECT * FROM flores WHERE id = ?');
            $stmt->execute([$id]);
            $flor = $stmt->fetch();

            if (!$flor) {
                http_response_code(404);
                echo json_encode(['error' => 'Flor no encontrada']);
            } else {
                echo json_encode($flor);
            }
            break;

        case 'DELETE':
            verificarToken();
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'Se requiere el ID de la flor en la URL']);
                exit;
            }

            // Verificar existencia primero — rowCount()=0 no distingue "no existe" de "ya oculta"
            $chk = $pdo->prepare('SELECT id FROM flores WHERE id = ?');
            $chk->execute([$id]);
            if (!$chk->fetch()) {
                http_response_code(404);
                echo json_encode(['error' => 'Flor no encontrada']);
                exit;
            }

            $stmt = $pdo->prepare('UPDATE flores SET disponible = 0 WHERE id = ?');
            $stmt->execute([$id]);
            echo json_encode(['mensaje' => 'Flor ocultada correctamente']);
            break;

        default:
            http_response_code(405);
            echo json_encode(['error' => 'Método no permitido']);
    }
} catch (Throwable $e) {
    if ($e instanceof PDOException && ($e->errorInfo[1] ?? 0) === 1062) {
        http_response_code(409);
        echo json_encode(['error' => 'Ya existe una flor con ese nombre']);
        exit;
    }
    $detalle = esModoDesarrollo() ? ' — ' . $e->getMessage() : ' [' . get_class($e) . ':' . $e->getCode() . ']';
    error_log('[req:' . _reqId() . '] FlowerMatch flores.php' . $detalle);
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}
