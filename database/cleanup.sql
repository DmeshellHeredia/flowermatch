-- database/cleanup.sql — Limpieza opcional de registro_recomendaciones
--
-- La tabla registro_recomendaciones es analítica: registra cada consulta
-- al recomendador con la intención detectada, las flores sugeridas y el modo
-- (python-nlp, php-reglas). Crece indefinidamente; no tiene TTL automático.
--
-- Ejecutar manualmente cuando el tamaño sea relevante:
--   mysql -u <user> -p flowermatch < database/cleanup.sql
--
-- O desde el cliente MySQL:
--   USE flowermatch;
--   SOURCE database/cleanup.sql;

DELETE FROM registro_recomendaciones
WHERE creado_en < NOW() - INTERVAL 90 DAY;

-- Mostrar cuántos registros quedan tras la limpieza
SELECT COUNT(*) AS registros_activos FROM registro_recomendaciones;
