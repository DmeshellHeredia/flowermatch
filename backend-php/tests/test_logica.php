<?php
/**
 * Pruebas de lógica PHP - FlowerMatch
 * Ejecutar: php backend-php/tests/test_logica.php
 *
 * No requiere servidor web ni base de datos activa.
 * Prueba lógica de validación y sanitización pura.
 */

require_once __DIR__ . '/../config/validacion.php';

$ok  = 0;
$fail = 0;

function assert_igual(mixed $esperado, mixed $obtenido, string $nombre): void {
    global $ok, $fail;
    if ($esperado === $obtenido) {
        echo "  [OK] $nombre\n";
        $ok++;
    } else {
        $esperadoStr = var_export($esperado, true);
        $obtenidoStr = var_export($obtenido, true);
        echo "  [FAIL] $nombre\n    esperado: $esperadoStr\n    obtenido: $obtenidoStr\n";
        $fail++;
    }
}

function assert_verdadero(bool $condicion, string $nombre): void {
    assert_igual(true, $condicion, $nombre);
}

function sanitizarTexto(string $valor): string {
    return strip_tags(trim($valor));
}

function esNumeroPositivo(mixed $valor): bool {
    return is_numeric($valor) && (float)$valor >= 0;
}

function normalizarDisponible(mixed $valor): int {
    return $valor ? 1 : 0;
}

function construirOrden(string $orden): string {
    return match ($orden) {
        'precio_asc'  => 'precio ASC',
        'precio_desc' => 'precio DESC',
        default       => 'nombre ASC',
    };
}

function validarCamposRequeridos(array $datos, array $requeridos): ?string {
    foreach ($requeridos as $campo) {
        if (!array_key_exists($campo, $datos) || (empty($datos[$campo]) && $datos[$campo] !== 0)) {
            return $campo;
        }
    }
    return null;
}

function validarId(mixed $id): bool {
    return isset($id) && is_numeric($id) && (int)$id > 0;
}

// Simula nueva lógica de soft delete: verifica existencia con SELECT antes de rowCount
function simularSoftDelete(mixed $id, bool $existeEnBd): array {
    if (!validarId($id)) {
        return ['status' => 400, 'data' => ['error' => 'Se requiere el ID de la flor en la URL']];
    }
    if (!$existeEnBd) {
        return ['status' => 404, 'data' => ['error' => 'Flor no encontrada']];
    }
    // UPDATE SET disponible=0 — rowCount no importa, existencia ya verificada
    return ['status' => 200, 'data' => ['mensaje' => 'Flor ocultada correctamente']];
}

// Simula la vieja lógica (rowCount como prueba de existencia) — documenta el bug
function simularSoftDeleteViejo(mixed $id, int $rowCount): array {
    if (!validarId($id)) {
        return ['status' => 400, 'data' => ['error' => 'Se requiere el ID de la flor en la URL']];
    }
    if ($rowCount === 0) {
        return ['status' => 404, 'data' => ['error' => 'Flor no encontrada']];
    }
    return ['status' => 200, 'data' => ['mensaje' => 'Flor eliminada correctamente']];
}

// Simula hard delete de admin
function simularHardDelete(mixed $id, bool $existeEnBd): array {
    if (!validarId($id)) {
        return ['status' => 400, 'data' => ['error' => 'Se requiere el ID en la URL']];
    }
    if (!$existeEnBd) {
        return ['status' => 404, 'data' => ['error' => 'Flor no encontrada']];
    }
    return ['status' => 200, 'data' => ['mensaje' => 'Flor eliminada definitivamente']];
}

// Simula cargarEnv(): no sobreescribe variables ya definidas
function simularCargarEnv(array $envActual, array $archivo): array {
    foreach ($archivo as $clave => $valor) {
        if (!isset($envActual[$clave])) {
            $envActual[$clave] = $valor;
        }
    }
    return $envActual;
}

// Replica la lógica de cors.php: valida esquema, fallback a localhost:3000
function resolverFrontendUrl(array $env): string {
    $envUrl = $env['FRONTEND_URL'] ?? '';
    if ($envUrl === '' || $envUrl === '*') return 'http://localhost:3000';
    $esquema = parse_url($envUrl, PHP_URL_SCHEME);
    return ($esquema === 'http' || $esquema === 'https') ? $envUrl : 'http://localhost:3000';
}

echo "\n== Sanitización ==\n";
assert_igual("Hola", sanitizarTexto("  Hola  "), "trim de espacios");
assert_igual("Rosa Roja", sanitizarTexto("<script>Rosa Roja</script>"), "strip_tags elimina script");
assert_igual("Rosa", sanitizarTexto("<b>Rosa</b>"), "strip_tags elimina b");
assert_igual("", sanitizarTexto("  "), "solo espacios → vacío");

echo "\n== Validación de precio ==\n";
assert_verdadero(esNumeroPositivo(25), "precio entero positivo");
assert_verdadero(esNumeroPositivo("19.99"), "precio string decimal");
assert_verdadero(esNumeroPositivo(0), "precio cero es válido");
assert_verdadero(!esNumeroPositivo(-5), "precio negativo inválido");
assert_verdadero(!esNumeroPositivo("abc"), "precio texto inválido");
assert_verdadero(!esNumeroPositivo(""), "precio vacío inválido");

echo "\n== disponible TINYINT(1) ==\n";
assert_igual(1, normalizarDisponible(true),  "true  → 1");
assert_igual(0, normalizarDisponible(false), "false → 0");
assert_igual(1, normalizarDisponible(1),     "1     → 1");
assert_igual(0, normalizarDisponible(0),     "0     → 0");
assert_igual(0, normalizarDisponible(""),    "\"\"  → 0 (evita error SQL)");
assert_igual(1, normalizarDisponible("1"),   "\"1\"  → 1");

echo "\n== Orden SQL ==\n";
assert_igual("precio ASC",  construirOrden("precio_asc"),  "precio_asc");
assert_igual("precio DESC", construirOrden("precio_desc"), "precio_desc");
assert_igual("nombre ASC",  construirOrden("nombre"),      "nombre (default)");
assert_igual("nombre ASC",  construirOrden("invalido"),    "valor inválido → default");

echo "\n== Campos requeridos ==\n";
$datos = ['nombre' => 'Rosa', 'color' => 'Rojo', 'ocasion' => 'romance', 'precio' => 25];
assert_igual(null, validarCamposRequeridos($datos, ['nombre', 'color', 'ocasion', 'precio']), "todos los campos presentes → null");

$datosIncompletos = ['nombre' => 'Rosa', 'color' => 'Rojo', 'ocasion' => '', 'precio' => 25];
assert_igual('ocasion', validarCamposRequeridos($datosIncompletos, ['nombre', 'color', 'ocasion', 'precio']), "campo vacío → retorna nombre del campo");

$datosSinPrecio = ['nombre' => 'Rosa', 'color' => 'Rojo', 'ocasion' => 'romance'];
assert_igual('precio', validarCamposRequeridos($datosSinPrecio, ['nombre', 'color', 'ocasion', 'precio']), "campo ausente → retorna nombre del campo");

echo "\n== Autenticación ==\n";

function extraerToken(string $cabecera): ?string {
    if (!str_starts_with($cabecera, 'Bearer ')) return null;
    return substr($cabecera, 7);
}

// Replica la lógica de auth.php para poder testearla sin HTTP context
function esTokenValido(string $cabecera, string $tokenEsperado): bool {
    if ($tokenEsperado === '') return false;
    if (!str_starts_with($cabecera, 'Bearer ')) return false;
    return hash_equals($tokenEsperado, substr($cabecera, 7));
}

assert_verdadero(esTokenValido('Bearer fm_token_test', 'fm_token_test'),  "token correcto pasa");
assert_verdadero(!esTokenValido('Bearer fm_token_malo', 'fm_token_test'), "token incorrecto falla");
assert_verdadero(!esTokenValido('fm_token_test', 'fm_token_test'),        "sin 'Bearer ' prefijo → falla");
assert_verdadero(!esTokenValido('Bearer cualquiera', ''),                  "token vacío en config → siempre falla");
assert_verdadero(!esTokenValido('', ''),                                   "cabecera y config vacíos → falla");
assert_verdadero(!esTokenValido('Bearer  doble-espacio', 'doble-espacio'), "doble espacio no coincide con token");

echo "\n== CORS origen ==\n";

// Replica la lógica de cors.php: FRONTEND_URL del entorno, default localhost:3000
function resolverOrigenCors(?string $frontendUrl): string {
    return $frontendUrl ?? 'http://localhost:3000';
}

assert_igual('https://mi-app.com',    resolverOrigenCors('https://mi-app.com'),   "usa FRONTEND_URL cuando está definido");
assert_igual('http://localhost:3000', resolverOrigenCors(null),                    "default localhost:3000 cuando no hay FRONTEND_URL");
assert_igual('http://localhost:4000', resolverOrigenCors('http://localhost:4000'), "respeta puerto diferente");
assert_verdadero(resolverOrigenCors(null) !== '*',                                 "el default nunca es '*'");
assert_verdadero(resolverOrigenCors('https://prod.com') !== '*',                   "con URL definida tampoco retorna '*'");

echo "\n== CORS headers permitidos ==\n";

// Lee cors.php directamente: sin servidor, sin side-effects, prueba el archivo real.
// Si alguien elimina X-CSRF-Token de Access-Control-Allow-Headers, este test falla.
$_corsCfg = file_get_contents(__DIR__ . '/../config/cors.php');
assert_verdadero(
    (bool) preg_match('/Access-Control-Allow-Headers:[^\']*X-CSRF-Token/', $_corsCfg),
    'X-CSRF-Token declarado en Access-Control-Allow-Headers'
);
assert_verdadero(
    (bool) preg_match('/Access-Control-Allow-Headers:[^\']*Authorization/', $_corsCfg),
    'Authorization declarado en Access-Control-Allow-Headers'
);
unset($_corsCfg);

echo "\n== Carga de variables de entorno ==\n";

// Variable ya definida no se sobreescribe (ej. $_ENV del servidor web prevalece)
$env = simularCargarEnv(['FRONTEND_URL' => 'https://ya-definido.com'], ['FRONTEND_URL' => 'otro-valor']);
assert_igual('https://ya-definido.com', $env['FRONTEND_URL'], "variable ya definida no se sobreescribe");

// Variable nueva se carga del archivo
$env = simularCargarEnv([], ['FRONTEND_URL' => 'https://desde-archivo.com', 'DB_HOST' => '10.0.0.1']);
assert_igual('https://desde-archivo.com', $env['FRONTEND_URL'], "FRONTEND_URL se carga del archivo");
assert_igual('10.0.0.1',                  $env['DB_HOST'],       "DB_HOST se carga del archivo");

// Archivo vacío/inexistente no define nada
$env = simularCargarEnv([], []);
assert_verdadero(!isset($env['FRONTEND_URL']), "archivo vacío → FRONTEND_URL no definido");

echo "\n== Resolución de FRONTEND_URL en CORS ==\n";

$r = resolverFrontendUrl(['FRONTEND_URL' => 'https://mi-app.com']);
assert_igual('https://mi-app.com', $r, "FRONTEND_URL definido → se usa");
assert_verdadero($r !== '*',           "con valor definido nunca retorna wildcard");

$r = resolverFrontendUrl([]);
assert_igual('http://localhost:3000', $r, "sin FRONTEND_URL → default localhost:3000");
assert_verdadero($r !== '*',               "default nunca es wildcard");

$r = resolverFrontendUrl(['FRONTEND_URL' => 'http://localhost:4000']);
assert_igual('http://localhost:4000', $r, "puerto diferente respetado");
assert_verdadero($r !== '*',               "localhost alternativo no es wildcard");

// No puede contener wildcard bajo ninguna circunstancia
assert_verdadero(resolverFrontendUrl(['FRONTEND_URL' => 'https://prod.com']) !== '*', "producción tampoco es wildcard");

echo "\n== FRONTEND_URL inválido → fallback (se loguea en todos los entornos) ==\n";
assert_igual('http://localhost:3000', resolverFrontendUrl(['FRONTEND_URL' => '*']),            "wildcard explícito → fallback");
assert_igual('http://localhost:3000', resolverFrontendUrl(['FRONTEND_URL' => 'no-es-url']),    "sin esquema → fallback");
assert_igual('http://localhost:3000', resolverFrontendUrl(['FRONTEND_URL' => 'ftp://x.com']), "esquema ftp → fallback");
assert_igual('http://localhost:3000', resolverFrontendUrl(['FRONTEND_URL' => '']),             "vacío explícito → fallback (sin log)");
assert_igual('http://localhost:3000', resolverFrontendUrl([]),                                 "ausente → fallback (sin log)");

echo "\n== Soft delete — nueva lógica (SELECT-first) ==\n";

$r = simularSoftDelete(1, true);
assert_igual(200,                       $r['status'],         "flor disponible → ocultar OK");
assert_igual('Flor ocultada correctamente', $r['data']['mensaje'], "mensaje soft delete correcto");

// Flor ya oculta (disponible=0): SELECT la encuentra igualmente → debe ser éxito
$r = simularSoftDelete(1, true);
assert_igual(200, $r['status'], "flor ya oculta pero existe → también es éxito");

$r = simularSoftDelete(999, false);
assert_igual(404, $r['status'],             "flor inexistente → 404");
assert_igual('Flor no encontrada', $r['data']['error'], "mensaje 404 soft delete");

$r = simularSoftDelete(null, false);
assert_igual(400, $r['status'], "sin id → 400");

$r = simularSoftDelete(0, false);
assert_igual(400, $r['status'], "id=0 → 400");

$r = simularSoftDelete(-3, false);
assert_igual(400, $r['status'], "id negativo → 400");

echo "\n== Diferencia vieja vs nueva lógica ==\n";
// Bug: flor con disponible=0 existente → rowCount=0 → vieja lógica responde 404 (incorrecto)
$viejo = simularSoftDeleteViejo(1, 0);
assert_igual(404, $viejo['status'], "BUG vieja: rowCount=0 → 404 aunque flor existe");

// Fix: SELECT verifica existencia → 200 aunque rowCount sería 0
$nuevo = simularSoftDelete(1, true);
assert_igual(200, $nuevo['status'], "FIX nueva: SELECT-first → 200 aunque ya estaba oculta");

echo "\n== Hard delete admin ==\n";

$r = simularHardDelete(5, true);
assert_igual(200,                          $r['status'],         "flor existente → hard delete OK");
assert_igual('Flor eliminada definitivamente', $r['data']['mensaje'], "mensaje hard delete correcto");

$r = simularHardDelete(99, false);
assert_igual(404, $r['status'],             "flor inexistente → 404");
assert_igual('Flor no encontrada', $r['data']['error'], "mensaje 404 hard delete");

$r = simularHardDelete(null, true);
assert_igual(400, $r['status'], "hard delete sin id → 400");

$r = simularHardDelete(-1, true);
assert_igual(400, $r['status'], "hard delete id negativo → 400");

$r = simularHardDelete(0, true);
assert_igual(400, $r['status'], "hard delete id=0 → 400");

echo "\n== Auth vacía en endpoints protegidos ==\n";
assert_verdadero(!esTokenValido('', 'mi_token_secreto'),        "cabecera vacía → deniega");
assert_verdadero(!esTokenValido('Bearer ', 'mi_token_secreto'), "Bearer sin token → deniega");
assert_verdadero(!esTokenValido('Bearer mi_token', ''),         "token vacío en servidor → siempre deniega");

function estaBloqueado(array $registros, string $ip, int $ahora, int $ventana = 600, int $max = 5): bool
{
    if (!isset($registros[$ip])) return false;
    $e = $registros[$ip];
    if ($ahora - $e['primer_intento'] >= $ventana) return false;
    return $e['intentos'] >= $max;
}

function registrarFallo(array $registros, string $ip, int $ahora, int $ventana = 600): array
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

function purgarExpirados(array $registros, int $ahora, int $ventana = 600): array
{
    foreach ($registros as $ip => $e) {
        if ($ahora - $e['primer_intento'] >= $ventana) {
            unset($registros[$ip]);
        }
    }
    return $registros;
}

// Acumula $n fallos para $ip en el mismo timestamp $t
function acumularFallos(int $n, string $ip, int $t): array
{
    $reg = [];
    for ($i = 0; $i < $n; $i++) {
        $reg = registrarFallo($reg, $ip, $t);
    }
    return $reg;
}

echo "\n== Rate limiting ==\n";

$ip = '1.2.3.4';
$t  = 1_000_000; // timestamp fijo arbitrario

// Sin intentos previos: no bloqueado
assert_verdadero(!estaBloqueado([], $ip, $t), "sin intentos → no bloqueado");

// 4 fallos acumulados: todavía no bloqueado
$reg4 = acumularFallos(4, $ip, $t);
assert_verdadero(!estaBloqueado($reg4, $ip, $t), "4 fallos → no bloqueado");

// 5 fallos: bloqueado (el 6to intento llega y encuentra 5 → 429)
$reg5 = acumularFallos(5, $ip, $t);
assert_verdadero(estaBloqueado($reg5, $ip, $t),     "5 fallos → bloqueado");
assert_verdadero(estaBloqueado($reg5, $ip, $t + 1), "6to intento dentro de ventana → sigue bloqueado");

// Ventana expirada: aunque haya 5 fallos no bloquea
assert_verdadero(!estaBloqueado($reg5, $ip, $t + 601), "ventana expirada → no bloqueado");

// Login exitoso limpia intentos
$regL = acumularFallos(3, $ip, $t);
$regL = limpiarIP($regL, $ip);
assert_verdadero(!estaBloqueado($regL, $ip, $t), "login exitoso limpia intentos → no bloqueado");

// Otra IP con 5 fallos no afecta a una IP distinta
assert_verdadero(!estaBloqueado($reg5, '9.9.9.9', $t), "otra IP no bloqueada");

// Fallo ocurrido después de ventana reinicia el contador a 1
$regR = registrarFallo($reg5, $ip, $t + 601);
assert_igual(1, $regR[$ip]['intentos'],             "fallo post-ventana reinicia contador a 1");
assert_verdadero(!estaBloqueado($regR, $ip, $t + 601), "1 intento tras reset → no bloqueado");

// Replica la condición de flores.php para validación de rango de precio
function validarRangoPrecio(?float $min, ?float $max): ?string {
    if ($min !== null && $max !== null && $min > $max) {
        return 'precio_min no puede ser mayor que precio_max';
    }
    return null;
}

echo "\n== Validación de rango de precio ==\n";
assert_igual('precio_min no puede ser mayor que precio_max', validarRangoPrecio(50, 10),  "min>max → error");
assert_igual(null, validarRangoPrecio(10, 50),   "min<max → ok");
assert_igual(null, validarRangoPrecio(10, 10),   "min=max → ok");
assert_igual(null, validarRangoPrecio(0,  10),   "min=0 → ok");
assert_igual(null, validarRangoPrecio(null, 50), "solo max → ok (sin cross-validate)");
assert_igual(null, validarRangoPrecio(10, null), "solo min → ok (sin cross-validate)");
assert_igual(null, validarRangoPrecio(null, null), "ambos null → ok");

echo "\n== Detección de nombre duplicado (409) ==\n";

// La condición exacta que usa flores.php en su catch(Throwable):
//   $e instanceof PDOException && ($e->errorInfo[1] ?? 0) === 1062

$eDup = new PDOException("Duplicate entry 'Rosa Roja' for key 'uq_nombre'");
$eDup->errorInfo = ['23000', 1062, "Duplicate entry 'Rosa Roja' for key 'uq_nombre'"];
assert_verdadero(
    $eDup instanceof PDOException && ($eDup->errorInfo[1] ?? 0) === 1062,
    "PDOException errorInfo[1]=1062 → es duplicado (debe devolver 409)"
);

$eOtro = new PDOException("FK violation");
$eOtro->errorInfo = ['23000', 1451, "FK violation"];
assert_verdadero(
    !($eOtro instanceof PDOException && ($eOtro->errorInfo[1] ?? 0) === 1062),
    "PDOException errorInfo[1]≠1062 → no es duplicado"
);

$eGen = new RuntimeException("Error genérico");
assert_verdadero(
    !($eGen instanceof PDOException && ($eGen->errorInfo[1] ?? 0) === 1062),
    "RuntimeException → no es duplicado"
);

$eSinInfo = new PDOException("Sin errorInfo");
assert_verdadero(
    !($eSinInfo instanceof PDOException && ($eSinInfo->errorInfo[1] ?? 0) === 1062),
    "PDOException sin errorInfo → no es duplicado (nullsafe con ??)"
);

echo "\n== purgarExpirados ==\n";

// Registro expirado se elimina
$reg = acumularFallos(3, $ip, $t);
$purgado = purgarExpirados($reg, $t + 601);
assert_verdadero(!isset($purgado[$ip]),              "registro expirado se purga");

// Registro dentro de ventana se conserva
$purgado = purgarExpirados($reg, $t + 599);
assert_verdadero(isset($purgado[$ip]),               "registro reciente se conserva");

// Exactamente en el límite (= ventana) ya expira
$purgado = purgarExpirados($reg, $t + 600);
assert_verdadero(!isset($purgado[$ip]),              "registro exactamente en límite se purga");

// Sólo el expirado se elimina; el reciente permanece
$ip2   = '5.6.7.8';
$regDos = acumularFallos(5, $ip,  $t);
$regDos = acumularFallos(2, $ip2, $t + 400);       // reciente al evaluar $t+601
$purgado = purgarExpirados($regDos, $t + 601);
assert_verdadero(!isset($purgado[$ip]),              "IP antigua purgada en lista mixta");
assert_verdadero(isset($purgado[$ip2]),              "IP reciente conservada en lista mixta");

// Sin expirados: array idéntico
$purgado = purgarExpirados($reg, $t + 1);
assert_igual($reg, $purgado,                        "sin expirados → array sin cambios");

// Array vacío: no explota
$purgado = purgarExpirados([], $t);
assert_igual([], $purgado,                          "array vacío → devuelve array vacío");

echo "\n== validarNombre ==\n";
assert_igual('Rosa Roja',    validarNombre('  Rosa Roja  '),          'trim y acepta válido');
assert_igual('Sin tags',     validarNombre('<b>Sin tags</b>'),        'strip_tags');
assert_igual(false,          validarNombre(''),                       'vacío → false');
assert_igual(false,          validarNombre('   '),                    'solo espacios → false');
assert_igual(false,          validarNombre(str_repeat('a', 101)),     'más de 100 chars → false');
assert_igual(str_repeat('a', 100), validarNombre(str_repeat('a', 100)), 'exactamente 100 chars → válido');
assert_igual(false,          validarNombre(42),                       'tipo no string → false');
assert_igual(false,          validarNombre(null),                     'null → false');

echo "\n== validarColor ==\n";
assert_igual('Rojo',         validarColor('Rojo'),                   'color válido');
assert_igual('Morado claro', validarColor('Morado claro'),           'color con espacio válido');
assert_igual('Azul',         validarColor('  Azul  '),               'trim aplicado');
assert_igual(false,          validarColor('rojo'),                   'minúsculas no permitidas');
assert_igual(false,          validarColor('Verde oscuro'),           'color fuera de whitelist');
assert_igual(false,          validarColor(''),                       'vacío → false');
assert_igual(false,          validarColor(null),                     'null → false');
assert_igual(false,          validarColor(123),                      'tipo no string → false');
// todos los colores definidos son aceptados
foreach (COLORES_VALIDOS as $c) {
    assert_igual($c, validarColor($c), "color '$c' está en whitelist");
}

echo "\n== Colores desde shared/colores.json ==\n";
$coloresJSON = json_decode(
    file_get_contents(__DIR__ . '/../../shared/colores.json'),
    true
);
assert_verdadero(is_array($coloresJSON) && count($coloresJSON) > 0, 'shared/colores.json cargado y no vacío');
assert_igual($coloresJSON, COLORES_VALIDOS,                         'COLORES_VALIDOS coincide con shared/colores.json');
assert_verdadero(in_array('Rojo', COLORES_VALIDOS, true),           'Rojo existe en colores cargados del JSON');
assert_verdadero(in_array('Morado claro', COLORES_VALIDOS, true),   'Morado claro existe en colores cargados del JSON');
// un color que no está en la lista no pasa validación
assert_igual(false, validarColor('Turquesa'),                       'Turquesa no en whitelist → false');

echo "\n== validarOcasion ==\n";
assert_igual('romance,amor', validarOcasion('romance,amor'),         'ocasión válida');
assert_igual(false,          validarOcasion(''),                     'vacío → false');
assert_igual(false,          validarOcasion(str_repeat('x', 201)),   'más de 200 chars → false');
assert_igual(str_repeat('x', 200), validarOcasion(str_repeat('x', 200)), 'exactamente 200 → válido');
assert_igual(false,          validarOcasion(null),                   'null → false');
assert_igual('limpio',       validarOcasion('<script>limpio</script>'), 'strip_tags');

echo "\n== validarPrecio ==\n";
assert_igual(25.0,           validarPrecio(25),                      'entero positivo');
assert_igual(19.99,          validarPrecio('19.99'),                 'string decimal');
assert_igual(0.01,           validarPrecio(0.01),                    'mínimo positivo válido');
assert_igual(false,          validarPrecio(0),                       'cero → false (no positivo)');
assert_igual(false,          validarPrecio(-5),                      'negativo → false');
assert_igual(false,          validarPrecio('abc'),                   'texto → false');
assert_igual(false,          validarPrecio(''),                      'vacío → false');
assert_igual(false,          validarPrecio(null),                    'null → false');
assert_igual(PRECIO_MAX,     validarPrecio(PRECIO_MAX),              'exactamente PRECIO_MAX → válido');
assert_igual(false,          validarPrecio(PRECIO_MAX + 0.01),       'PRECIO_MAX + 0.01 → false');
assert_igual(false,          validarPrecio(1_000_000_000),           'mil millones → false');
assert_igual(false,          validarPrecio(1e15),                    'notación científica extrema → false');

echo "\n== validarPrecioFiltro ==\n";
assert_igual(0.0,              validarPrecioFiltro(0),                    'cero → válido (precio_min=0 es "sin límite inferior")');
assert_igual(25.0,             validarPrecioFiltro(25),                   'entero positivo');
assert_igual(19.99,            validarPrecioFiltro('19.99'),              'string decimal');
assert_igual((float) PRECIO_FILTRO_MAX, validarPrecioFiltro(PRECIO_FILTRO_MAX), 'exactamente PRECIO_FILTRO_MAX → válido');
assert_igual(false,            validarPrecioFiltro(PRECIO_FILTRO_MAX + 1), 'un peso sobre el límite → false');
assert_igual(false,            validarPrecioFiltro(999999999),            'extremadamente alto → false');
assert_igual(false,            validarPrecioFiltro(-1),                   'negativo → false');
assert_igual(false,            validarPrecioFiltro(-0.01),                'negativo decimal → false');
assert_igual(false,            validarPrecioFiltro('abc'),                'texto no numérico → false');
assert_igual(false,            validarPrecioFiltro('NaN'),                'NaN string → false');
assert_igual(false,            validarPrecioFiltro(null),                 'null → false');
assert_igual(false,            validarPrecioFiltro(''),                   'vacío → false');
assert_igual(false,            validarPrecioFiltro('1e10'),               'notación científica exagerada → false');
assert_igual(1.5,              validarPrecioFiltro('1.5'),                'string decimal válido dentro del límite');

echo "\n== validarDescripcion ==\n";
assert_igual('',             validarDescripcion(''),                 'vacío es válido (opcional)');
assert_igual('texto',        validarDescripcion('  texto  '),        'trim aplicado');
assert_igual('sin tag',      validarDescripcion('<p>sin tag</p>'),   'strip_tags');
assert_igual(false,          validarDescripcion(str_repeat('a', 1001)), 'más de 1000 → false');
assert_igual(str_repeat('a', 1000), validarDescripcion(str_repeat('a', 1000)), '1000 chars → válido');
assert_igual(false,          validarDescripcion(null),               'null → false');

echo "\n== validarImagen ==\n";
assert_igual('',                  validarImagen(''),                     'vacío es válido (opcional)');
assert_igual('/img/rosa.jpg',     validarImagen('/img/rosa.jpg'),        'ruta válida');
assert_igual('/img/rosa.jpg',     validarImagen('  /img/rosa.jpg  '),    'trim aplicado');
assert_igual(false,               validarImagen('../config/database.php'), 'path traversal → false');
assert_igual(false,               validarImagen('../../etc/passwd'),      'doble traversal → false');
assert_igual(false,               validarImagen(str_repeat('a', 256)),    'más de 255 → false');
assert_igual(str_repeat('a', 255), validarImagen(str_repeat('a', 255)),  '255 chars → válido');
assert_igual('img.jpg',           validarImagen('<script>img.jpg</script>'), 'strip_tags en imagen');
assert_igual(false,               validarImagen(null),                   'null → false');
assert_igual('/imagenes/flores/Rosa Roja.jpg', validarImagen('/imagenes/flores/Rosa Roja.jpg'), 'ruta local válida');
assert_igual('https://example.com/a.jpg',      validarImagen('https://example.com/a.jpg'),     'URL https válida');
assert_igual(false,               validarImagen('javascript:alert(1)'),          'javascript: → false');
assert_igual(false,               validarImagen('data:image/png;base64,abc'),   'data: → false');
assert_igual(false,               validarImagen('vbscript:alert(1)'),            'vbscript: → false');
assert_igual(false,               validarImagen('DATA:image/png;base64,abc'),   'DATA: mayúsculas → false');
assert_igual(false,               validarImagen('../config.php'),          'path traversal corto → false');
assert_igual(false,               validarImagen('//evil.com/a.jpg'),      'protocol-relative → false');
assert_igual('/imagenes/a.jpg',   validarImagen('/imagenes/a.jpg'),        'ruta /imagenes/ → válida');

echo "\n== validarIdParam ==\n";
assert_igual(1,    validarIdParam(1),       'entero positivo');
assert_igual(99,   validarIdParam('99'),    'string numérico');
assert_igual(false, validarIdParam(0),      'cero → false');
assert_igual(false, validarIdParam(-3),     'negativo → false');
assert_igual(false, validarIdParam('abc'),  'texto → false');
assert_igual(false, validarIdParam(null),   'null → false');
assert_igual(false, validarIdParam(''),     'vacío → false');
assert_igual(false, validarIdParam('0'),    'string cero → false');

echo "\n== validarOrden ==\n";
assert_igual('precio ASC',  validarOrden('precio_asc'),  'precio_asc');
assert_igual('precio DESC', validarOrden('precio_desc'), 'precio_desc');
assert_igual('nombre ASC',  validarOrden('nombre'),      'nombre');
assert_igual('nombre ASC',  validarOrden(null),          'null → default nombre');
assert_igual('nombre ASC',  validarOrden(''),            'vacío → default nombre');
assert_igual(false,         validarOrden('PRECIO_ASC'),  'mayúsculas no permitidas');
assert_igual(false,         validarOrden('invalido'),    'valor desconocido → false');
assert_igual(false,         validarOrden('; DROP TABLE'), 'inyección → false');

echo "\n== validarBusqueda ==\n";
assert_igual('',          validarBusqueda(''),                       'vacío es válido');
assert_igual('rosa roja', validarBusqueda('  rosa roja  '),          'trim aplicado');
assert_igual('texto',     validarBusqueda('<script>texto</script>'), 'strip_tags');
assert_igual(false,       validarBusqueda(str_repeat('x', 201)),     'más de 200 → false');
assert_igual(false,       validarBusqueda(null),                     'null → false');

echo "\n== JSON corrupto — detección y reset ==\n";

// El patrón de detección que usan rl_leer_con_lock y rl_modificar_con_lock:
//   $datos = ($raw !== '' && $raw !== false) ? json_decode($raw, true) : null;
//   if (!is_array($datos)) { if ($raw !== '' && $raw !== false) error_log(…); $datos = []; }

$raw = '{invalido:json';
$datos = ($raw !== false && $raw !== '') ? json_decode($raw, true) : null;
assert_verdadero(!is_array($datos), "JSON malformado → json_decode devuelve non-array");
$esCorrupto = !is_array($datos) && $raw !== false && $raw !== '';
assert_verdadero($esCorrupto, "JSON non-vacío + non-array → detectado como corrupto (triggea error_log)");
$datos = is_array($datos) ? $datos : [];
assert_igual([], $datos, "JSON corrupto → se recupera como array vacío");

$rawVacio = '';
$datosVacio = ($rawVacio !== false && $rawVacio !== '') ? json_decode($rawVacio, true) : null;
$esCorruptoVacio = !is_array($datosVacio) && $rawVacio !== false && $rawVacio !== '';
assert_verdadero(!$esCorruptoVacio, "archivo vacío → no es corrupto, no triggea error_log");
$datosVacio = is_array($datosVacio) ? $datosVacio : [];
assert_igual([], $datosVacio, "archivo vacío → se inicializa como array vacío");

echo "\n== rl_modificar_con_lock — purga + registro atómico ==\n";

// Simula la función que rl_modificar_con_lock ejecuta en el path de login fallido:
//   function (array $reg) use ($ip, $ahora): array {
//       $reg = purgarExpirados($reg, $ahora);
//       return registrarFallo($reg, $ip, $ahora);
//   }

$ipT = '2.3.4.5';
$tT  = 2_000_000;

// Entrada expirada para la misma IP: tras purga, fallo reinicia a 1
$regT = [$ipT => ['intentos' => 4, 'primer_intento' => $tT - 700]]; // expirado
$resT = (function (array $r) use ($ipT, $tT): array {
    $r = purgarExpirados($r, $tT);
    return registrarFallo($r, $ipT, $tT);
})($regT);
assert_igual(1, $resT[$ipT]['intentos'], "entrada expirada purgada → nuevo fallo reinicia contador a 1");
assert_verdadero($resT[$ipT]['primer_intento'] === $tT, "primer_intento actualizado al momento del nuevo fallo");

// IP reciente de otro host se conserva intacta durante la operación
$ipFresh = '7.8.9.0';
$regMix  = [
    $ipT     => ['intentos' => 3, 'primer_intento' => $tT - 700], // expirado
    $ipFresh => ['intentos' => 2, 'primer_intento' => $tT - 10],  // reciente
];
$resMix = (function (array $r) use ($ipT, $tT): array {
    $r = purgarExpirados($r, $tT);
    return registrarFallo($r, $ipT, $tT);
})($regMix);
assert_verdadero(isset($resMix[$ipFresh]),               "IP reciente conservada durante purga + registro");
assert_igual(2, $resMix[$ipFresh]['intentos'],           "contador de IP reciente no modificado");
assert_igual(1, $resMix[$ipT]['intentos'],               "IP expirada reinicia a 1 tras purga");

// Simula el path de login exitoso:
//   function (array $reg) use ($ip, $ahora): array {
//       $reg = limpiarIP($reg, $ip);
//       return purgarExpirados($reg, $ahora);
//   }
$regOk = acumularFallos(3, $ipT, $tT);
$regOk[$ipFresh] = ['intentos' => 5, 'primer_intento' => $tT - 700]; // expirado de otra IP
$resOk = (function (array $r) use ($ipT, $ipFresh, $tT): array {
    $r = limpiarIP($r, $ipT);
    return purgarExpirados($r, $tT);
})($regOk);
assert_verdadero(!isset($resOk[$ipT]),    "login exitoso elimina entrada de la IP autenticada");
assert_verdadero(!isset($resOk[$ipFresh]), "purga post-login también limpia otras IPs expiradas");

// ── flores_sugeridas como JSON — nombre con coma no rompe estructura ──────────
echo "\n== flores_sugeridas: json_encode (registro_recomendaciones) ==\n";

$floresNormales = [
    ['nombre' => 'Rosa Roja',   'precio' => 25],
    ['nombre' => 'Girasol',     'precio' => 15],
];
$json1 = json_encode(array_column($floresNormales, 'nombre'), JSON_UNESCAPED_UNICODE);
assert_igual('["Rosa Roja","Girasol"]', $json1, 'nombres normales → array JSON');
assert_verdadero(is_array(json_decode($json1, true)), 'resultado es JSON parseable');

$floresConComa = [
    ['nombre' => 'Rosa, Silvestre', 'precio' => 10],
    ['nombre' => 'Clavel, Rosado',  'precio' => 8],
];
$json2 = json_encode(array_column($floresConComa, 'nombre'), JSON_UNESCAPED_UNICODE);
assert_verdadero(is_array(json_decode($json2, true)), 'nombre con coma → JSON parseable (no ambiguo)');
assert_igual(2, count(json_decode($json2, true)), 'nombre con coma → array de 2 elementos, no 4');

$sinFlores = [];
$json3 = json_encode(array_column($sinFlores, 'nombre'), JSON_UNESCAPED_UNICODE);
assert_igual('[]', $json3, 'sin flores → array JSON vacío');

// ── validarFlorIntegridad / filtrarFloresValidas ──────────────────────────────
echo "\n== Integridad de flores antes de servir ==\n";

$florValida = ['id' => 1, 'nombre' => 'Rosa Roja', 'precio' => '25.00'];
assert_igual(null,         validarFlorIntegridad($florValida),                    'flor válida → null');
assert_igual('nombre vacío', validarFlorIntegridad(['id' => 2, 'nombre' => '',   'precio' => 10]), 'nombre vacío → razón');
assert_igual('nombre vacío', validarFlorIntegridad(['id' => 3, 'nombre' => null, 'precio' => 10]), 'nombre null → razón');
assert_igual('precio <= 0', validarFlorIntegridad(['id' => 4, 'nombre' => 'X',  'precio' => 0]),  'precio 0 → razón');
assert_igual('precio <= 0', validarFlorIntegridad(['id' => 5, 'nombre' => 'X',  'precio' => -1]), 'precio negativo → razón');
assert_igual('precio <= 0', validarFlorIntegridad(['id' => 6, 'nombre' => 'X',  'precio' => '0.00']), 'precio "0.00" string → razón');

// filtrarFloresValidas: excluye inválidas y llama callback por cada descarte
$entrada = [
    ['id' => 1, 'nombre' => 'Rosa Roja', 'precio' => 25],
    ['id' => 2, 'nombre' => '',          'precio' => 10],
    ['id' => 3, 'nombre' => 'Girasol',   'precio' => 0],
    ['id' => 4, 'nombre' => 'Tulipán',   'precio' => 8],
];
$descartadas = [];
$resultado = filtrarFloresValidas($entrada, function (array $flor, string $razon) use (&$descartadas): void {
    $descartadas[] = ['id' => $flor['id'], 'razon' => $razon];
});

assert_igual(2,   count($resultado),                  'filtrarFloresValidas: 2 flores válidas pasan');
assert_igual(1,   $resultado[0]['id'],                'filtrarFloresValidas: primera válida es id=1');
assert_igual(4,   $resultado[1]['id'],                'filtrarFloresValidas: segunda válida es id=4');
assert_igual(2,   count($descartadas),                'filtrarFloresValidas: 2 callbacks disparados');
assert_igual(2,   $descartadas[0]['id'],              'callback: primera descartada es id=2');
assert_igual('nombre vacío', $descartadas[0]['razon'], 'callback: razón = nombre vacío');
assert_igual(3,   $descartadas[1]['id'],              'callback: segunda descartada es id=3');
assert_igual('precio <= 0', $descartadas[1]['razon'], 'callback: razón = precio <= 0');

// array vacío no dispara callbacks
$descartadas2 = [];
$res2 = filtrarFloresValidas([], function () use (&$descartadas2): void { $descartadas2[] = true; });
assert_igual([],  $res2,           'array vacío → resultado vacío');
assert_igual(0,   count($descartadas2), 'array vacío → 0 callbacks');

echo "\n════════════════════════════════════\n";
echo "Resultado: $ok OK, $fail FAIL\n";
echo "════════════════════════════════════\n";
exit($fail > 0 ? 1 : 0);
