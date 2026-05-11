<?php
// Lee backend-php/.env y puebla $_ENV.
// El guard function_exists protege contra doble inclusión accidental.

if (!function_exists('cargarEnv')) {
    function cargarEnv(string $archivo): void
    {
        if (!file_exists($archivo)) return;

        foreach (file($archivo, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $linea) {
            $linea = trim($linea);
            if ($linea === '' || $linea[0] === '#' || !str_contains($linea, '=')) continue;
            [$clave, $valor] = explode('=', $linea, 2);
            $clave = trim($clave);
            $valor = trim($valor, " \t\"'");
            // No sobreescribir variables ya definidas (ej. por el servidor web)
            if (!isset($_ENV[$clave])) {
                $_ENV[$clave] = $valor;
                putenv("$clave=$valor");
            }
        }
    }
}

cargarEnv(__DIR__ . '/../.env');

if (!function_exists('esModoDesarrollo')) {
    function esModoDesarrollo(): bool
    {
        return ($_ENV['APP_ENV'] ?? 'production') === 'development';
    }
}
