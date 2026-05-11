-- Inicialización de base de datos para producción — FlowerMatch
-- Ejecutar como root: mysql -u root -p < database/init-prod.sql

-- Crear usuario con privilegios mínimos (sin CREATE, DROP, GRANT, ALTER)
CREATE USER IF NOT EXISTS 'flowermatch_user'@'localhost'
  IDENTIFIED BY 'CAMBIAR_POR_CONTRASENA_SEGURA';

GRANT SELECT, INSERT, UPDATE, DELETE
  ON flowermatch.*
  TO 'flowermatch_user'@'localhost';

FLUSH PRIVILEGES;
