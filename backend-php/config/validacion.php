<?php
/**
 * Validación de inputs - FlowerMatch
 */

$_colores_raw = file_get_contents(__DIR__ . '/../../shared/colores.json');
$_colores     = $_colores_raw !== false ? json_decode($_colores_raw, true) : null;
if (!is_array($_colores) || $_colores === []) {
    throw new \RuntimeException('shared/colores.json no encontrado o inválido');
}
define('COLORES_VALIDOS', $_colores);
unset($_colores_raw, $_colores);

function validarNombre(mixed $v): string|false
{
    if (!is_string($v)) return false;
    $v = trim(strip_tags($v));
    return ($v !== '' && mb_strlen($v) <= 100) ? $v : false;
}

function validarColor(mixed $v): string|false
{
    if (!is_string($v)) return false;
    $v = trim($v);
    return in_array($v, COLORES_VALIDOS, true) ? $v : false;
}

function validarOcasion(mixed $v): string|false
{
    if (!is_string($v)) return false;
    $v = trim(strip_tags($v));
    return ($v !== '' && mb_strlen($v) <= 200) ? $v : false;
}

const PRECIO_MAX = 99_999_999.99;

function validarPrecio(mixed $v): float|false
{
    if (!is_numeric($v)) return false;
    $f = (float) $v;
    return ($f > 0 && $f <= PRECIO_MAX) ? $f : false;
}

const PRECIO_FILTRO_MAX = 100_000;

function validarPrecioFiltro(mixed $v): float|false
{
    if (!is_numeric($v)) return false;
    $f = (float) $v;
    return ($f >= 0 && $f <= PRECIO_FILTRO_MAX) ? $f : false;
}

function validarDescripcion(mixed $v): string|false
{
    if (!is_string($v)) return false;
    $v = trim(strip_tags($v));
    return mb_strlen($v) <= 1000 ? $v : false;
}

// Rechaza path traversal (..) y esquemas peligrosos (javascript:, data:, vbscript:)
function validarImagen(mixed $v): string|false
{
    if (!is_string($v)) return false;
    $v = trim(strip_tags($v));
    if (mb_strlen($v) > 255 || str_contains($v, '..') || str_starts_with($v, '//')) return false;
    $lower = strtolower($v);
    if (str_starts_with($lower, 'javascript:') ||
        str_starts_with($lower, 'data:') ||
        str_starts_with($lower, 'vbscript:')) return false;
    return $v;
}

function validarIdParam(mixed $v): int|false
{
    if (!is_numeric($v)) return false;
    $i = (int) $v;
    return $i > 0 ? $i : false;
}

// false → rechazar con 400; no usar default silencioso para inputs inválidos
function validarOrden(mixed $v): string|false
{
    return match ($v) {
        'precio_asc'  => 'precio ASC',
        'precio_desc' => 'precio DESC',
        'nombre', null, '' => 'nombre ASC',
        default => false,
    };
}

function validarBusqueda(mixed $v): string|false
{
    if (!is_string($v)) return false;
    $v = trim(strip_tags($v));
    return mb_strlen($v) <= 200 ? $v : false;
}

// Verifica integridad de una fila de flores antes de servirla.
// Retorna null si es válida; cadena con la razón si no lo es.
function validarFlorIntegridad(array $flor): ?string
{
    if (($flor['nombre'] ?? '') === '') return 'nombre vacío';
    if (!((float)($flor['precio'] ?? 0) > 0))  return 'precio <= 0';
    return null;
}

// Filtra flores inválidas; llama $onInvalida(array $flor, string $razon) por cada descarte.
function filtrarFloresValidas(array $flores, callable $onInvalida): array
{
    $validas = [];
    foreach ($flores as $flor) {
        $razon = validarFlorIntegridad($flor);
        if ($razon !== null) {
            $onInvalida($flor, $razon);
        } else {
            $validas[] = $flor;
        }
    }
    return $validas;
}
