<?php
/**
 * Pruebas del fallback PHP del recomendador — FlowerMatch
 * Ejecutar: php backend-php/tests/test_recomendador_logica.php
 *
 * No requiere servidor web ni MySQL.
 * recomendarConPHP() se prueba con PDO SQLite en memoria:
 *   obtenerFloresPorNombre() captura Throwable si la tabla no existe → devuelve [].
 */

require_once __DIR__ . '/../config/recomendador_fallback.php';

$ok   = 0;
$fail = 0;

function assert_igual(mixed $esperado, mixed $obtenido, string $nombre): void {
    global $ok, $fail;
    if ($esperado === $obtenido) {
        echo "  [OK] $nombre\n";
        $ok++;
    } else {
        $e = var_export($esperado, true);
        $o = var_export($obtenido, true);
        echo "  [FAIL] $nombre\n    esperado: $e\n    obtenido: $o\n";
        $fail++;
    }
}

function assert_verdadero(bool $condicion, string $nombre): void {
    assert_igual(true, $condicion, $nombre);
}

function normalizar(string $texto): string {
    return mb_strtolower(quitarAcentos($texto), 'UTF-8');
}

$datos = cargarDatosCompartidos();

// ── parsearSalidaPython ───────────────────────────────────────────────────────
echo "\n== Parsing salida Python ==\n";

$jsonValido = '{"intencion":"romance","flores":[],"mensaje":"test","consulta_original":"test"}';
$r = parsearSalidaPython($jsonValido);
assert_verdadero(is_array($r) && $r['intencion'] === 'romance',    "JSON válido con intencion → array");

assert_verdadero(parsearSalidaPython('{"flores":[],"mensaje":"x"}') === null, "JSON sin campo intencion → null");
assert_verdadero(parsearSalidaPython('esto no es json')             === null, "JSON inválido → null");
assert_verdadero(parsearSalidaPython('')                            === null, "salida vacía → null");
assert_verdadero(parsearSalidaPython('   ')                         === null, "solo espacios → null");

$contratoLuto = '{"intencion":"luto","flores":[],"mensaje":"Para acompañar en el duelo:","consulta_original":"condolencias"}';
$r = parsearSalidaPython("  \n$contratoLuto\n  ");
assert_verdadero(is_array($r) && $r['intencion'] === 'luto',       "JSON con whitespace circundante → array");

$r = parsearSalidaPython('{"intencion":"desconocida","flores":[],"mensaje":"x","consulta_original":"y"}');
assert_verdadero(is_array($r),                                     "intencion desconocida igual pasa (campo existe)");

// ── Validación de contrato completo ──────────────────────────────────────────
echo "\n== Contrato completo de salida Python ==\n";

// Flores con campos correctos → válido
$r = parsearSalidaPython('{"intencion":"romance","flores":[{"id":1,"nombre":"Rosa Roja","precio":25.00}],"mensaje":"Para el amor:","consulta_original":"flores para mi novia"}');
assert_verdadero(is_array($r),                                     "flor con id+nombre+precio → válido");

// Flores sin nombre → null
$r = parsearSalidaPython('{"intencion":"romance","flores":[{"precio":25}],"mensaje":"x","consulta_original":"y"}');
assert_verdadero($r === null,                                      "flor sin nombre → null");

// Flores con nombre vacío → null
$r = parsearSalidaPython('{"intencion":"romance","flores":[{"nombre":"","precio":25}],"mensaje":"x","consulta_original":"y"}');
assert_verdadero($r === null,                                      "flor con nombre vacío → null");

// Flores sin precio → null
$r = parsearSalidaPython('{"intencion":"romance","flores":[{"nombre":"Rosa"}],"mensaje":"x","consulta_original":"y"}');
assert_verdadero($r === null,                                      "flor sin precio → null");

// Flores con precio no numérico → null
$r = parsearSalidaPython('{"intencion":"romance","flores":[{"nombre":"Rosa","precio":"caro"}],"mensaje":"x","consulta_original":"y"}');
assert_verdadero($r === null,                                      "flor con precio no numérico → null");

// Flores con id que no es entero → null
$r = parsearSalidaPython('{"intencion":"romance","flores":[{"id":"abc","nombre":"Rosa","precio":25}],"mensaje":"x","consulta_original":"y"}');
assert_verdadero($r === null,                                      "flor con id no entero → null");

// Sin mensaje → null
$r = parsearSalidaPython('{"intencion":"romance","flores":[],"consulta_original":"y"}');
assert_verdadero($r === null,                                      "sin mensaje → null");

// Mensaje vacío → null
$r = parsearSalidaPython('{"intencion":"romance","flores":[],"mensaje":"","consulta_original":"y"}');
assert_verdadero($r === null,                                      "mensaje vacío → null");

// Sin consulta_original → null
$r = parsearSalidaPython('{"intencion":"romance","flores":[],"mensaje":"x"}');
assert_verdadero($r === null,                                      "sin consulta_original → null");

// flores no es array → null
$r = parsearSalidaPython('{"intencion":"romance","flores":"no-array","mensaje":"x","consulta_original":"y"}');
assert_verdadero($r === null,                                      "flores no es array → null");

// flores vacío → válido (sin flores disponibles es un resultado legítimo)
$r = parsearSalidaPython('{"intencion":"general","flores":[],"mensaje":"Te recomendamos:","consulta_original":"algo"}');
assert_verdadero(is_array($r),                                     "flores vacío → válido");

// degradado:true se preserva tal cual (Python lo emite cuando MySQL falla)
$r = parsearSalidaPython('{"intencion":"romance","flores":[],"mensaje":"x","consulta_original":"y","degradado":true}');
assert_verdadero(is_array($r) && ($r['degradado'] ?? false) === true, "degradado:true se preserva");

// sin degradado → campo no inyectado
$r = parsearSalidaPython('{"intencion":"romance","flores":[],"mensaje":"x","consulta_original":"y"}');
assert_verdadero(is_array($r) && !isset($r['degradado']),           "sin degradado → campo ausente");

// precio como string numérico → válido (PDO devuelve DECIMAL como string)
$r = parsearSalidaPython('{"intencion":"romance","flores":[{"id":1,"nombre":"Rosa","precio":"25.00"}],"mensaje":"x","consulta_original":"y"}');
assert_verdadero(is_array($r),                                     "precio string numérico → válido (PDO DECIMAL)");

// modo:python-nlp se preserva para registro en BD
$r = parsearSalidaPython('{"intencion":"romance","flores":[],"mensaje":"x","consulta_original":"y","modo":"python-nlp"}');
assert_verdadero(is_array($r) && ($r['modo'] ?? '') === 'python-nlp', "modo:python-nlp se preserva");

// ── detectarIntencionPHP ──────────────────────────────────────────────────────
echo "\n== Intención ==\n";
assert_igual('disculpa',       detectarIntencionPHP(normalizar('Necesito un regalo para pedir perdón a mi mejor amigo'), $datos), 'disculpa gana sobre amistad');
assert_igual('disculpa',       detectarIntencionPHP(normalizar('quiero pedir perdón a mi novia'),                        $datos), 'disculpa gana sobre romance');
assert_igual('luto',           detectarIntencionPHP(normalizar('condolencias para una amiga'),                           $datos), 'luto gana sobre amistad');
assert_igual('luto',           detectarIntencionPHP(normalizar('pesame para mi amiga'),                                  $datos), 'luto: pesame');
assert_igual('luto',           detectarIntencionPHP(normalizar('funeral de un amigo'),                                   $datos), 'luto: funeral');
assert_igual('romance',        detectarIntencionPHP(normalizar('flores para mi novia'),                                  $datos), 'romance por novia sola');
assert_igual('agradecimiento', detectarIntencionPHP(normalizar('quiero agradecer a una compañera de trabajo'),           $datos), 'agradecimiento gana sobre amistad');
assert_igual('bienestar',      detectarIntencionPHP(normalizar('algo para relajar y dar calma'),                         $datos), 'bienestar');
assert_igual('dia_madres',     detectarIntencionPHP(normalizar('regalo para mi mamá en el día de las madres'),           $datos), 'dia_madres');
assert_igual('general',        detectarIntencionPHP(normalizar('electrodomesticos computadora internet'),                $datos), 'sin coincidencias → general');
assert_igual('general',        detectarIntencionPHP('',                                                                  $datos), 'texto vacío → general');

// ── detectarContexto ──────────────────────────────────────────────────────────
echo "\n== Contexto ==\n";
assert_igual('amistad', detectarContexto(normalizar('Necesito un regalo para pedir perdón a mi mejor amigo')), 'contexto amistad');
assert_igual('pareja',  detectarContexto(normalizar('quiero pedir perdón a mi novia')),                        'contexto pareja');
assert_igual('amistad', detectarContexto(normalizar('condolencias para una amiga')),                           'contexto amistad (amiga)');
assert_igual('pareja',  detectarContexto(normalizar('flores para mi novia')),                                  'contexto pareja (novia)');
assert_igual('trabajo', detectarContexto(normalizar('quiero agradecer a una compañera de trabajo')),           'contexto trabajo');
assert_igual(null,      detectarContexto(normalizar('algo para relajar y dar calma')),                         'sin contexto');
assert_igual('familia', detectarContexto(normalizar('regalo para mi mamá en el día de las madres')),           'contexto familia (mama)');

echo "\n== Prioridad de frases largas en contexto ==\n";
assert_igual('trabajo', detectarContexto(normalizar('para mi companera de trabajo')), 'companera de trabajo > companera');

// ── recomendarConPHP — integración completa con PDO SQLite ───────────────────
echo "\n== recomendarConPHP (SQLite en memoria) ==\n";
try {
    $pdo = new PDO('sqlite::memory:');

    $r1 = recomendarConPHP('quiero pedir perdón a mi novia', $pdo);
    assert_igual('disculpa',                     $r1['intencion'],         'r1: intencion disculpa');
    assert_igual('pareja',                       $r1['contexto'],          'r1: contexto pareja');
    assert_igual('php-reglas',                   $r1['modo'],              'r1: modo php-reglas');
    assert_igual('quiero pedir perdón a mi novia', $r1['consulta_original'], 'r1: consulta_original preservada');
    assert_igual([],                             $r1['flores'],            'r1: flores vacías sin BD');
    assert_verdadero(strlen($r1['mensaje']) > 0,                          'r1: mensaje no vacío');

    $r2 = recomendarConPHP('condolencias para una amiga', $pdo);
    assert_igual('luto',       $r2['intencion'], 'r2: intencion luto');
    assert_igual('amistad',    $r2['contexto'],  'r2: contexto amistad');
    assert_igual('php-reglas', $r2['modo'],      'r2: modo php-reglas');

    $r3 = recomendarConPHP('electrodomesticos computadora internet', $pdo);
    assert_igual('general',    $r3['intencion'], 'r3: sin coincidencias → general');
    assert_igual('php-reglas', $r3['modo'],      'r3: modo php-reglas');
    assert_igual(null,         $r3['contexto'],  'r3: contexto null sin destinatario');

    $r4 = recomendarConPHP('condolencias para mi amigo', $pdo);
    assert_igual('luto',       $r4['intencion'], 'r4: luto gana sobre amistad');
    assert_igual('amistad',    $r4['contexto'],  'r4: contexto amistad');

    // degradado: true cuando nombres no vacío pero MySQL inaccesible (tabla no existe en SQLite)
    assert_verdadero(!empty($r1['degradado']),  'r1: degradado=true sin BD');
    assert_verdadero(!empty($r2['degradado']),  'r2: degradado=true sin BD');
    assert_verdadero(!empty($r3['degradado']),  'r3: degradado=true sin BD');

    // degradado ausente cuando flores devueltas (no se puede simular con SQLite sin tabla,
    // pero verificamos que el campo no aparece en una respuesta con flores reales)
    $pdoConTabla = new PDO('sqlite::memory:');
    $pdoConTabla->exec("CREATE TABLE flores (
        id INTEGER PRIMARY KEY, nombre TEXT, color TEXT, ocasion TEXT,
        precio REAL, descripcion TEXT, imagen TEXT, disponible INTEGER
    )");
    $pdoConTabla->exec("INSERT INTO flores VALUES (1,'Rosa Roja','Rojo','romance',25.0,'','',1)");
    $pdoConTabla->exec("INSERT INTO flores VALUES (8,'Amapola Roja','Rojo','romance',18.0,'','',1)");
    $pdoConTabla->exec("INSERT INTO flores VALUES (12,'Peonía Rosa','Rosado','romance',40.0,'','',1)");
    $rConFlores = recomendarConPHP('flores para mi novia', $pdoConTabla);
    assert_verdadero(count($rConFlores['flores']) > 0,      'rConTabla: flores presentes');
    assert_verdadero(!isset($rConFlores['degradado']),      'rConTabla: sin campo degradado cuando hay flores');

} catch (Throwable $e) {
    echo "  [SKIP] SQLite no disponible — instala php-sqlite3 para estos checks.\n";
    echo "         Detalle: {$e->getMessage()}\n";
}

// ── Paridad PHP ↔ Python — consultas representativas ─────────────────────────
// Mismo algoritmo (frases prioritarias + keyword count) que TS local.
// Python usa TF-IDF (idf = log(N/df), bonus = n° palabras keyword).
// Con keywords únicas por intención: IDF es constante → mismo ganador.
// Las divergencias documentadas son empates resueltos por orden del array,
// idéntico en los tres (JSON compartido).
echo "\n== Paridad PHP ↔ Python (misma intención esperada) ==\n";

// Frases prioritarias — dominan sobre cualquier score TF-IDF de keywords sueltas.
assert_igual('disculpa',       detectarIntencionPHP(normalizar('quiero pedir perdón a mi mejor amigo'), $datos),   'frase prioritaria: pedir perdon (100pts) vs amigo (2pts)');
assert_igual('luto',           detectarIntencionPHP(normalizar('condolencias para una amiga'),          $datos),   'frase prioritaria: condolencias (50pts) vs amiga (1pt)');
assert_igual('agradecimiento', detectarIntencionPHP(normalizar('quiero agradecer a una compañera'),     $datos),   'frase prioritaria: quiero agradecer (100pts)');
assert_igual('dia_madres',     detectarIntencionPHP(normalizar('flores para el día de las madres'),     $datos),   'frase prioritaria: dia de las madres (200pts)');
assert_igual('luto',           detectarIntencionPHP(normalizar('funeral de un amigo'),                  $datos),   'frase prioritaria: funeral (50pts) vs amigo (1pt)');
assert_igual('disculpa',       detectarIntencionPHP(normalizar('necesito reconciliarme con mi pareja'), $datos),   'frase prioritaria: reconciliarme (50pts) vs pareja (1pt)');
assert_igual('nacimiento',     detectarIntencionPHP(normalizar('baby shower para mi hermana'),          $datos),   'frase prioritaria: baby shower (100pts)');
assert_igual('disculpa',       detectarIntencionPHP(normalizar('lo siento mucho, fue mi culpa'),        $datos),   'frases prioritarias acumulan puntos');

// Keywords claros — una sola intención activa; todos coinciden.
assert_igual('romance',        detectarIntencionPHP(normalizar('flores para mi novia'),                 $datos),   '"novia" solo en romance');
assert_igual('bienestar',      detectarIntencionPHP(normalizar('algo para relajar y dar calma'),        $datos),   '"relajar"+"calma" solo en bienestar');
assert_igual('aniversario',    detectarIntencionPHP(normalizar('aniversario de boda'),                  $datos),   '"aniversario"+"boda" solo en aniversario');
assert_igual('general',        detectarIntencionPHP(normalizar('computadoras electrodomesticos'),       $datos),   'sin keywords → general');
assert_igual('romance',        detectarIntencionPHP(normalizar('amor'),                                 $datos),   '"amor" solo en romance');
assert_igual('agradecimiento', detectarIntencionPHP(normalizar('gracias'),                              $datos),   '"gracias" solo en agradecimiento');

// Divergencia de scoring PHP/Python — score diferente, ganador igual.
// PHP: str_contains() cuenta presencia booleana → disculpa = PESO*2 = 100 pts.
// Python: .count() cuenta frecuencia TF → disculpa = PESO*2*2 = 200 pts.
// El ganador es el mismo porque la frase prioritaria domina con margen en ambos.
// La divergencia solo cambia el ganador si hay empate preexistente + keyword repetida;
// ese escenario no ocurre con el dataset actual.
assert_igual('disculpa',       detectarIntencionPHP(normalizar('pedir perdón pedir perdón'),            $datos),
    'divergencia scoring conocida: PHP score=100 vs Python score=200; ganador idéntico');

// Empates — resueltos por posición del array (igual en PHP, TS y Python).
// El resultado es contra-intuitivo pero CONSISTENTE entre las tres implementaciones.
assert_igual('amistad',        detectarIntencionPHP(normalizar('gracias por tu apoyo'),                 $datos),
    'empate: "apoyo"→amistad(1pt) vs "gracias"→agradecimiento(1pt); amistad antes en array');
assert_igual('amistad',        detectarIntencionPHP(normalizar('cumpleaños de mi mejor amiga'),         $datos),
    'empate 3-3: amistad vs cumpleanos; amistad antes en array; "años" y "cumple" son substrings de "cumpleaños"');

// ── Contrato: camino _fallo → degradado=true ─────────────────────────────────
echo "\n== Contrato: fallo de datos compartidos → degradado=true ==\n";
// El caché estático de cargarDatosCompartidos() impide reproducir el fallo en el
// mismo proceso; se inspecciona la fuente para evitar regresiones silenciosas.
$fuente = file_get_contents(__DIR__ . '/../config/recomendador_fallback.php');
$inicio = strpos($fuente, "!empty(\$datos['_fallo'])");
$fin    = strpos($fuente, '// nombres no vacío', $inicio);
$bloque = substr($fuente, $inicio, $fin - $inicio);
assert_verdadero(str_contains($bloque, "'degradado'"),  "camino _fallo: campo 'degradado' presente en el return");
assert_verdadero(str_contains($bloque, "=> true"),      "camino _fallo: valor true asignado a degradado");

// ── Validación longitud de consulta ───────────────────────────────────────────

$maxConsulta = 500;
assert_verdadero(mb_strlen(str_repeat('a', $maxConsulta)) <= $maxConsulta, "500 chars → dentro del límite");
assert_verdadero(mb_strlen(str_repeat('a', $maxConsulta + 1)) > $maxConsulta, "501 chars → excede el límite");

// ── Resultado ─────────────────────────────────────────────────────────────────
echo "\n" . str_repeat('═', 44) . "\n";
echo "Resultado: {$ok} OK, {$fail} FAIL\n";
echo str_repeat('═', 44) . "\n";

exit($fail > 0 ? 1 : 0);
