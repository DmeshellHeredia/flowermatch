<?php
/**
 * Test del cascade completo del recomendador — FlowerMatch
 * Ejecutar: php backend-php/tests/test_cascade_recomendador.php
 *
 * Prueba el comportamiento EMERGENTE de la composición de capas, no cada capa aislada.
 * Este test DEBE FALLAR si:
 *   - una capa deja de incluir un campo del contrato
 *   - PHP y Python divergen en clasificación para una consulta no ambigua
 *   - el cascade llama a la capa equivocada
 *
 * Sin servidor web. Sin Python real. Sin MySQL.
 * Python se simula con callable injection en llamarPython().
 * PHP se ejercita con PDO SQLite en memoria (flores = []).
 */

require_once __DIR__ . '/../config/recomendar_python.php';
// recomendar_python.php ya incluye recomendador_fallback.php

$ok   = 0;
$fail = 0;

function assert_igual(mixed $esperado, mixed $obtenido, string $nombre): void
{
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

function assert_verdadero(bool $cond, string $nombre): void
{
    assert_igual(true, $cond, $nombre);
}

/**
 * Replica la lógica de cascade de api/recomendar.php sin HTTP ni BD real.
 *
 * @param bool $pythonUsado  Salida: true si Python respondió, false si se activó fallback PHP
 */
function cascade(string $consulta, ?callable $ejecutorPython, PDO $pdo, bool &$pythonUsado): array
{
    $resultado   = llamarPython($consulta, $ejecutorPython);
    $pythonUsado = ($resultado !== null);
    return $pythonUsado ? $resultado : recomendarConPHP($consulta, $pdo);
}

/**
 * Verifica que una respuesta satisface el contrato mínimo del recomendador.
 * Este es el único punto donde se define "qué forma válida tiene una respuesta".
 * Si PHP o Python dejan de incluir un campo, este check lo detecta.
 */
function assert_contrato(array $r, string $consulta, string $etiqueta): void
{
    foreach (['intencion', 'flores', 'mensaje', 'consulta_original', 'modo'] as $campo) {
        assert_igual(true, array_key_exists($campo, $r), "$etiqueta: campo '$campo' presente");
    }
    assert_verdadero(is_string($r['intencion']) && $r['intencion'] !== '',  "$etiqueta: intencion es string no vacío");
    assert_verdadero(is_array($r['flores']),                                "$etiqueta: flores es array");
    assert_verdadero(is_string($r['mensaje'])   && $r['mensaje'] !== '',    "$etiqueta: mensaje es string no vacío");
    assert_verdadero(is_string($r['modo'])      && $r['modo'] !== '',       "$etiqueta: modo es string no vacío");
    assert_igual($consulta, $r['consulta_original'],                        "$etiqueta: consulta_original preservada");
}

// ── Setup ─────────────────────────────────────────────────────────────────────
try {
    $pdo = new PDO('sqlite::memory:');
} catch (Throwable $e) {
    echo "  [SKIP] SQLite no disponible: {$e->getMessage()}\n";
    exit(0);
}

// Fixture: respuesta bien formada que simula lo que Python devolvería.
// Si alguien cambia el contrato de Python, debe actualizar este fixture
// Y verificar que PHP produce lo mismo con assert_contrato_pares().
$PYTHON_LUTO = [
    'intencion'         => 'luto',
    'contexto'          => 'amistad',
    'flores'            => [['nombre' => 'Lirio Blanco', 'precio' => 18.50]],
    'mensaje'           => 'Para acompañar en un momento de duelo:',
    'consulta_original' => 'condolencias para una amiga',
    'modo'              => 'python-nlp',
];

$PYTHON_ROMANCE = [
    'intencion'         => 'romance',
    'contexto'          => 'pareja',
    'flores'            => [['nombre' => 'Rosa Roja', 'precio' => 25.00]],
    'mensaje'           => 'Para expresar amor romántico, te recomendamos:',
    'consulta_original' => 'flores para mi novia',
    'modo'              => 'python-nlp',
];

// ── Caso 1: Python falla → PHP responde ──────────────────────────────────────
echo "\n== Cascade: Python falla → PHP responde ==\n";

$pythonUsado = true;
$r = cascade('condolencias para una amiga', fn($cmd, $t) => null, $pdo, $pythonUsado);

assert_igual(false,        $pythonUsado,   'Python no respondió (ejecutor null → null)');
assert_igual('php-reglas', $r['modo'],     'modo: php-reglas cuando Python falla');
assert_contrato($r, 'condolencias para una amiga', 'fallback-PHP');
assert_igual('luto',    $r['intencion'],   'PHP clasifica luto para condolencias');
assert_igual('amistad', $r['contexto'],    'PHP detecta contexto amistad para amiga');

// ── Caso 2: Python responde → PHP no se llama ─────────────────────────────────
echo "\n== Cascade: Python responde → PHP no se llama ==\n";

$pythonUsado = false;
$r = cascade(
    'condolencias para una amiga',
    fn($cmd, $t) => json_encode($PYTHON_LUTO),
    $pdo,
    $pythonUsado
);

assert_igual(true,         $pythonUsado,    'Python respondió (ejecutor devolvió JSON)');
assert_igual('python-nlp', $r['modo'],      'modo: python-nlp — PHP no se activó');
assert_igual('luto',       $r['intencion'], 'intencion de Python preservada en cascade');
assert_igual('amistad',    $r['contexto'],  'contexto de Python preservado en cascade');
assert_contrato($r, 'condolencias para una amiga', 'respuesta-Python');

// ── Caso 3: Contrato consistente entre capas ─────────────────────────────────
//
// Verifica que PHP y Python devuelven el mismo conjunto de claves Y clasifican
// igual la misma consulta no ambigua. Este test falla si:
//   a) PHP cambia la clasificación de 'condolencias para una amiga'
//   b) Las claves del contrato divergen entre capas
echo "\n== Contrato consistente entre capas ==\n";

$phpUsado = false;
$phpR = cascade('condolencias para una amiga', fn($cmd, $t) => null, $pdo, $phpUsado);

$pyUsado = false;
$pyR = cascade(
    'condolencias para una amiga',
    fn($cmd, $t) => json_encode($PYTHON_LUTO),
    $pdo,
    $pyUsado
);

// PHP debe clasificar igual que el fixture Python (ambos deben concordar)
assert_igual($PYTHON_LUTO['intencion'], $phpR['intencion'], 'PHP y Python: misma intencion para consulta clara');
assert_igual($PYTHON_LUTO['contexto'],  $phpR['contexto'],  'PHP y Python: mismo contexto para consulta clara');

// El conjunto de claves retornadas debe ser idéntico en ambas capas
$clavesPHP = array_keys($phpR);
$clavesPy  = array_keys($pyR);
sort($clavesPHP);
sort($clavesPy);
assert_igual($clavesPHP, $clavesPy, 'Mismo conjunto de claves en respuesta PHP y Python');

// ── Caso 4: Python devuelve JSON inválido → PHP responde ─────────────────────
echo "\n== Cascade: Python retorna JSON inválido → PHP responde ==\n";

$pythonUsado = true;
$r = cascade('flores para mi novia', fn($cmd, $t) => 'esto no es json', $pdo, $pythonUsado);

assert_igual(false,        $pythonUsado,   'Python descartado por JSON inválido');
assert_igual('php-reglas', $r['modo'],     'modo: php-reglas tras JSON inválido');
assert_contrato($r, 'flores para mi novia', 'fallback-tras-JSON-invalido');

// ── Caso 5: Python sin campo 'intencion' → PHP responde ──────────────────────
echo "\n== Cascade: Python sin campo intencion → PHP responde ==\n";

$pythonUsado = true;
$r = cascade(
    'flores para mi novia',
    fn($cmd, $t) => '{"flores":[],"mensaje":"test","modo":"python-nlp","consulta_original":"flores para mi novia"}',
    $pdo,
    $pythonUsado
);

assert_igual(false,        $pythonUsado,   'Python descartado: sin campo intencion');
assert_igual('php-reglas', $r['modo'],     'modo: php-reglas tras intencion ausente');
assert_contrato($r, 'flores para mi novia', 'fallback-tras-intencion-ausente');

// ── Caso 6: Python OK con consulta distinta ───────────────────────────────────
echo "\n== Cascade: Python OK — consulta romance ==\n";

$pythonUsado = false;
$r = cascade(
    'flores para mi novia',
    fn($cmd, $t) => json_encode($PYTHON_ROMANCE),
    $pdo,
    $pythonUsado
);

assert_igual(true,         $pythonUsado,    'Python respondió (romance)');
assert_igual('python-nlp', $r['modo'],      'modo: python-nlp');
assert_igual('romance',    $r['intencion'], 'intencion romance preservada');
assert_contrato($r, 'flores para mi novia', 'respuesta-Python-romance');

// PHP también clasifica 'romance' para esa consulta (coherencia de capas)
$phpUsado = false;
$phpR = cascade('flores para mi novia', fn($cmd, $t) => null, $pdo, $phpUsado);
assert_igual('romance',  $phpR['intencion'], 'PHP también clasifica romance para novia');
assert_igual('pareja',   $phpR['contexto'],  'PHP detecta contexto pareja para novia');

// ── Caso 7: Datos compartidos OK → sin sentinel _fallo ───────────────────────
echo "\n== Estado de datos compartidos ==\n";

$datos = cargarDatosCompartidos();
assert_verdadero(!isset($datos['_fallo']),           'datos cargados: sin sentinel _fallo');
assert_verdadero(isset($datos['palabras_clave']),     'datos cargados: palabras_clave presente');
assert_verdadero(isset($datos['recomendaciones']),    'datos cargados: recomendaciones presente');
assert_verdadero(isset($datos['frases_prioritarias']), 'datos cargados: frases_prioritarias presente');

// ── Resultado ─────────────────────────────────────────────────────────────────
echo "\n" . str_repeat('═', 52) . "\n";
echo "Resultado: {$ok} OK, {$fail} FAIL\n";
echo str_repeat('═', 52) . "\n";

exit($fail > 0 ? 1 : 0);
