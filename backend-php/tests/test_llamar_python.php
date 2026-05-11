<?php
/**
 * Tests de llamarPython() y _ejecutarSubproceso() — FlowerMatch
 * Ejecutar: php backend-php/tests/test_llamar_python.php
 *
 * No requiere Python ni servidor web.
 *
 * Estrategia de doble nivel:
 *   - llamarPython() se prueba inyectando un callable que reemplaza el subprocess.
 *   - _ejecutarSubproceso() se prueba con subprocesos PHP reales (php -r),
 *     que verifican el pipe management y el timeout sin depender de Python.
 */

require_once __DIR__ . '/../config/recomendar_python.php';

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

// Comando PHP portátil para subprocesos reales
$phpBin = PHP_BINARY;

// ── llamarPython() con callable injection ────────────────────────────────────
echo "\n== llamarPython() — lógica vía callable injection ==\n";

// 1. Ejecutor devuelve JSON válido → array con campos correctos
$jsonOk = '{"intencion":"romance","flores":[],"mensaje":"test","consulta_original":"quiero flores"}';
$r = llamarPython('quiero flores', fn($cmd, $t) => $jsonOk);
assert_verdadero(is_array($r),                  'JSON válido → array');
assert_igual('romance', $r['intencion'] ?? null, 'campo intencion correcto');

// 2. Ejecutor devuelve null → null (caller activará fallback PHP)
$r = llamarPython('consulta', fn($cmd, $t) => null);
assert_verdadero($r === null, 'ejecutor null → llamarPython null');

// 3. Ejecutor devuelve JSON malformado → null
$r = llamarPython('consulta', fn($cmd, $t) => 'esto no es json');
assert_verdadero($r === null, 'JSON inválido → null');

// 4. JSON válido pero sin campo 'intencion' → null (parsearSalidaPython lo rechaza)
$r = llamarPython('consulta', fn($cmd, $t) => '{"flores":[],"mensaje":"x"}');
assert_verdadero($r === null, 'JSON sin intencion → null');

// 5. JSON con espacios circundantes → array (trim en parsearSalidaPython; contrato completo)
$jsonLutoCompleto = '{"intencion":"luto","flores":[],"mensaje":"Para el duelo:","consulta_original":"consulta"}';
$r = llamarPython('consulta', fn($cmd, $t) => "  \n$jsonLutoCompleto\n  ");
assert_verdadero(is_array($r) && ($r['intencion'] ?? '') === 'luto', 'whitespace circundante → ok');

// 6. La consulta pasa al ejecutor dentro del array cmd
$cmdCapturado = null;
llamarPython('mi consulta especial', function (array $cmd, float $t) use (&$cmdCapturado) {
    $cmdCapturado = $cmd;
    return null;
});
assert_verdadero(
    is_array($cmdCapturado) && in_array('mi consulta especial', $cmdCapturado, true),
    'consulta incluida en cmd pasado al ejecutor'
);

// 7. Timeout pasado al ejecutor es positivo (5 s en producción)
$timeoutCapturado = null;
llamarPython('consulta', function (array $cmd, float $t) use (&$timeoutCapturado) {
    $timeoutCapturado = $t;
    return null;
});
assert_verdadero($timeoutCapturado !== null && $timeoutCapturado > 0.0, 'timeout > 0 pasado al ejecutor');

// 8. Ejecutor devuelve salida vacía → null (sin campo intencion)
$r = llamarPython('consulta', fn($cmd, $t) => '');
assert_verdadero($r === null, 'salida vacía → null');

// 9. Ejecutor devuelve solo espacios → null
$r = llamarPython('consulta', fn($cmd, $t) => '   ');
assert_verdadero($r === null, 'solo espacios → null');

// ── _ejecutarSubproceso() — pipes reales con subproceso PHP ─────────────────
echo "\n== _ejecutarSubproceso() — pipe management con php -r ==\n";

// 10. Proceso exitoso: stdout capturado correctamente
$salidaEsperada = '{"intencion":"test"}';
$salida = _ejecutarSubproceso(
    [$phpBin, '-r', "echo " . escapeshellarg($salidaEsperada) . ";"],
    5.0
);
assert_verdadero(is_string($salida) && str_contains($salida, 'test'), 'stdout capturado de proceso php -r');

// 11. Proceso con stderr: no rompe, stdout se devuelve igual
$salida = _ejecutarSubproceso(
    [$phpBin, '-r', 'fwrite(STDERR, "error de prueba"); echo "ok_stdout";'],
    5.0
);
assert_verdadero(is_string($salida) && str_contains($salida, 'ok_stdout'), 'stderr no interrumpe; stdout devuelto');

// 12. Proceso con exit(1): devuelve string (vacío o con salida parcial), no lanza excepción
$salida = _ejecutarSubproceso(
    [$phpBin, '-r', 'exit(1);'],
    5.0
);
assert_verdadero($salida === '' || $salida === null || is_string($salida), 'exit(1) no lanza excepción');

// 13. Timeout: proceso lento → null (solo en Unix; Windows no soporta non-blocking pipes)
if (PHP_OS_FAMILY !== 'Windows') {
    $salida = _ejecutarSubproceso(
        [$phpBin, '-r', 'sleep(10); echo "tardio";'],
        0.1   // 100 ms — suficiente para detectar el timeout pero no bloquear el test
    );
    assert_verdadero($salida === null, 'timeout corto → null');
} else {
    echo "  [SKIP] timeout corto → null: stream_set_blocking no funciona en Windows con proc_open\n";
}

// 14. Timeout corto: el proceso fue terminado, segunda llamada funciona (no hay leak de recursos)
$salida2 = _ejecutarSubproceso(
    [$phpBin, '-r', "echo 'segunda_llamada';"],
    5.0
);
assert_verdadero(is_string($salida2) && str_contains($salida2, 'segunda_llamada'), 'segunda llamada tras timeout → ok (sin leak)');

// 15. Salida multilínea: capturada completa
$salida = _ejecutarSubproceso(
    [$phpBin, '-r', 'echo "linea1\nlinea2\nlinea3";'],
    5.0
);
assert_verdadero(is_string($salida) && str_contains($salida, 'linea1') && str_contains($salida, 'linea3'), 'salida multilínea capturada completa');

// ── Resultado ─────────────────────────────────────────────────────────────────
echo "\n" . str_repeat('═', 52) . "\n";
echo "Resultado: {$ok} OK, {$fail} FAIL\n";
echo str_repeat('═', 52) . "\n";

exit($fail > 0 ? 1 : 0);
