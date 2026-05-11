<?php
/**
 * Lógica pura del fallback PHP del recomendador — FlowerMatch
 *
 * Funciones sin dependencias HTTP, sin PDO (salvo recomendarConPHP que lo recibe
 * como parámetro) y sin proc_open. Se incluyen desde api/recomendar.php y
 * directamente en backend-php/tests/test_recomendador_logica.php.
 */

// Mismo valor que Python (_PESO_PRIORITARIO = 50.0) y TS.
// Las frases multi-palabra reciben bonus = PESO × n_palabras para superar ruido TF-like.
if (!defined('PESO_PRIORITARIO')) {
    define('PESO_PRIORITARIO', 50.0);
}

function quitarAcentos(string $texto): string
{
    return str_replace(
        ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', 'Á', 'É', 'Í', 'Ó', 'Ú', 'Ñ'],
        ['a', 'e', 'i', 'o', 'u', 'u', 'n', 'a', 'e', 'i', 'o', 'u', 'n'],
        $texto
    );
}

/**
 * Verifica estructura mínima de los JSON compartidos.
 * Lanza RuntimeException con mensaje específico si algo falta o tiene tipo incorrecto.
 */
function validarEstructuraCompartida(
    array $intenciones,
    mixed $contextos,
    array $mensajesData,
    mixed $recomendaciones
): void {
    foreach (['frases_prioritarias', 'palabras_clave'] as $campo) {
        if (!array_key_exists($campo, $intenciones) || !is_array($intenciones[$campo])) {
            throw new RuntimeException("intenciones.json: falta o tipo incorrecto en \"$campo\"");
        }
    }
    if (!is_array($contextos)) {
        throw new RuntimeException('contextos.json: debe ser un objeto');
    }
    foreach (['genericos', 'contextuales'] as $campo) {
        if (!array_key_exists($campo, $mensajesData) || !is_array($mensajesData[$campo])) {
            throw new RuntimeException("mensajes.json: falta o tipo incorrecto en \"$campo\"");
        }
    }
    if (!is_array($recomendaciones)) {
        throw new RuntimeException('recomendaciones.json: debe ser un objeto');
    }
}

/**
 * Carga los datos del recomendador desde shared/recomendador/*.json.
 * Resultado cacheado por request mediante static.
 */
function cargarDatosCompartidos(): array
{
    static $cache = null;
    if ($cache !== null) return $cache;

    $base = realpath(__DIR__ . '/../../shared/recomendador');
    if ($base === false) {
        error_log('[req:' . (function_exists('_reqId') ? _reqId() : '-') . '] [recomendador] directorio shared/recomendador no encontrado');
        return ['_fallo' => true];  // no se cachea: el próximo request reintentará
    }
    try {
        $intenciones     = json_decode(file_get_contents("$base/intenciones.json"),    true, 512, JSON_THROW_ON_ERROR);
        $contextos       = json_decode(file_get_contents("$base/contextos.json"),       true, 512, JSON_THROW_ON_ERROR);
        $mensajesData    = json_decode(file_get_contents("$base/mensajes.json"),        true, 512, JSON_THROW_ON_ERROR);
        $recomendaciones = json_decode(file_get_contents("$base/recomendaciones.json"), true, 512, JSON_THROW_ON_ERROR);

        validarEstructuraCompartida($intenciones, $contextos, $mensajesData, $recomendaciones);

        return $cache = [  // solo se cachea cuando los datos son válidos
            'frases_prioritarias'   => $intenciones['frases_prioritarias'],
            'palabras_clave'        => $intenciones['palabras_clave'],
            'contextos'             => $contextos,
            'mensajes'              => $mensajesData['genericos'],
            'mensajes_contextuales' => $mensajesData['contextuales'],
            'recomendaciones'       => $recomendaciones,
        ];
    } catch (Throwable $e) {
        error_log('[req:' . (function_exists('_reqId') ? _reqId() : '-') . '] [recomendador] error cargando shared/recomendador — ' . $e->getMessage());
        return ['_fallo' => true];  // no se cachea: el próximo request reintentará
    }
}

/**
 * Detecta la intención a partir de texto ya normalizado (minúsculas, sin acentos).
 * Espejo del algoritmo Python: frases prioritarias → scoring TF-like con bonus por longitud.
 */
function detectarIntencionPHP(string $texto, array $datos): string
{
    $frasesPrioritarias = $datos['frases_prioritarias'] ?? [];
    $palabrasClave      = $datos['palabras_clave']      ?? [];

    $puntajes = array_fill_keys(array_keys($palabrasClave), 0.0);

    foreach ($frasesPrioritarias as $intencion => $frases) {
        foreach ($frases as $frase) {
            if (str_contains($texto, $frase)) {
                $puntajes[$intencion] = ($puntajes[$intencion] ?? 0.0)
                    + PESO_PRIORITARIO * str_word_count($frase);
            }
        }
    }

    foreach ($palabrasClave as $intencion => $palabras) {
        foreach ($palabras as $palabra) {
            if (str_contains($texto, $palabra)) {
                $puntajes[$intencion] += (float) str_word_count($palabra);
            }
        }
    }

    if (empty($puntajes) || max($puntajes) <= 0.0) {
        return 'general';
    }
    arsort($puntajes);
    return (string) array_key_first($puntajes);
}

function detectarContexto(string $texto): ?string
{
    $datos     = cargarDatosCompartidos();
    $contextos = $datos['contextos'] ?? [];

    $candidatos = [];
    foreach ($contextos as $ctx => $frases) {
        foreach ($frases as $frase) {
            $candidatos[] = [$frase, $ctx];
        }
    }
    usort($candidatos, fn($a, $b) => str_word_count($b[0]) - str_word_count($a[0]));

    foreach ($candidatos as [$frase, $ctx]) {
        if (str_contains($texto, $frase)) {
            return $ctx;
        }
    }
    return null;
}

function construirMensaje(string $intencion, ?string $contexto): string
{
    $datos                = cargarDatosCompartidos();
    $mensajesContextuales = $datos['mensajes_contextuales'] ?? [];
    $mensajes             = $datos['mensajes']              ?? [];

    if ($contexto !== null && isset($mensajesContextuales[$intencion][$contexto])) {
        return $mensajesContextuales[$intencion][$contexto];
    }
    return $mensajes[$intencion] ?? $mensajes['general'] ?? 'Te recomendamos estas flores:';
}

function parsearSalidaPython(string $salida): ?array
{
    $datos = json_decode(trim($salida), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        return null;
    }
    // intencion: string no vacío
    if (!is_string($datos['intencion'] ?? null) || $datos['intencion'] === '') {
        return null;
    }
    // flores: array (puede estar vacío; si tiene elementos deben cumplir el contrato)
    if (!is_array($datos['flores'] ?? null)) {
        return null;
    }
    foreach ($datos['flores'] as $flor) {
        if (!is_array($flor)
            || !is_string($flor['nombre'] ?? null) || $flor['nombre'] === ''
            || !is_numeric($flor['precio'] ?? null)
        ) {
            return null;
        }
        // id: opcional, pero si viene debe ser entero
        if (isset($flor['id']) && !is_int($flor['id'])) {
            return null;
        }
    }
    // mensaje y consulta_original: strings presentes
    if (!is_string($datos['mensaje'] ?? null) || $datos['mensaje'] === '') {
        return null;
    }
    if (!is_string($datos['consulta_original'] ?? null)) {
        return null;
    }
    return $datos;
}

function obtenerFloresPorNombre(array $nombres, PDO $pdo): array
{
    if (empty($nombres)) {
        return [];
    }
    try {
        $placeholders = implode(',', array_fill(0, count($nombres), '?'));
        $stmt         = $pdo->prepare("SELECT * FROM flores WHERE nombre IN ($placeholders) AND disponible = 1");
        $stmt->execute($nombres);
        return $stmt->fetchAll();
    } catch (Throwable $e) {
        error_log('[req:' . (function_exists('_reqId') ? _reqId() : '-') . '] [recomendador] error en obtenerFloresPorNombre: ' . $e->getMessage());
        return [];
    }
}

function recomendarConPHP(string $consulta, PDO $pdo): array
{
    $datos = cargarDatosCompartidos();

    if (!empty($datos['_fallo'])) {
        $cLog = mb_substr($consulta, 0, 100) . (mb_strlen($consulta) > 100 ? '…' : '');
        error_log('[req:' . (function_exists('_reqId') ? _reqId() : '-') . "] [recomendador] datos compartidos no disponibles — respuesta degradada | consulta=\"{$cLog}\"");
        return [
            'intencion'         => 'general',
            'contexto'          => null,
            'flores'            => [],
            'mensaje'           => 'El recomendador no está disponible temporalmente. Por favor, intenta de nuevo.',
            'consulta_original' => $consulta,
            'modo'              => 'php-reglas',
            'degradado'         => true,
        ];
    }

    $texto  = mb_strtolower(quitarAcentos($consulta), 'UTF-8');

    $intencionDetectada = detectarIntencionPHP($texto, $datos);
    $contexto           = detectarContexto($texto);
    $mensaje            = construirMensaje($intencionDetectada, $contexto);

    $nombres = ($datos['recomendaciones'] ?? [])[$intencionDetectada]
             ?? ($datos['recomendaciones'] ?? [])['general']
             ?? [];
    $flores  = obtenerFloresPorNombre($nombres, $pdo);

    // nombres no vacío pero flores vacío → MySQL inaccesible (no "sin resultados" válido)
    $degradado = !empty($nombres) && empty($flores);

    if ($degradado) {
        error_log('[req:' . (function_exists('_reqId') ? _reqId() : '-') . '] [recomendador] php-reglas degradado: MySQL no disponible en fallback');
    }

    return [
        'intencion'         => $intencionDetectada,
        'contexto'          => $contexto,
        'flores'            => $flores,
        'mensaje'           => $mensaje,
        'consulta_original' => $consulta,
        'modo'              => 'php-reglas',
        ...($degradado ? ['degradado' => true] : []),
    ];
}
