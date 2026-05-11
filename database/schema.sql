-- FlowerMatch: Esquema de base de datos
-- Ejecutar con: mysql -u root -p < database/schema.sql

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS flowermatch
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE flowermatch;

-- Tabla principal de flores
CREATE TABLE IF NOT EXISTS flores (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    nombre         VARCHAR(100)  NOT NULL,
    color          VARCHAR(50)   NOT NULL,
    ocasion        VARCHAR(200)  NOT NULL,
    precio         DECIMAL(10,2) NOT NULL,
    descripcion    TEXT,
    imagen         VARCHAR(255)  DEFAULT NULL,
    disponible     TINYINT(1)    DEFAULT 1,
    creado_en      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_nombre (nombre),
    INDEX idx_color (color),
    INDEX idx_disponible (disponible)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migración para bases de datos existentes:
-- ALTER TABLE flores ADD UNIQUE KEY uq_nombre (nombre);

-- Registro de consultas al recomendador para análisis
CREATE TABLE IF NOT EXISTS registro_recomendaciones (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    consulta            TEXT        NOT NULL,
    intencion_detectada VARCHAR(50),
    flores_sugeridas    TEXT,
    modo                VARCHAR(20),
    creado_en           TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_creado_en (creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migraciones para bases de datos existentes:
-- ALTER TABLE registro_recomendaciones ADD COLUMN modo VARCHAR(20) AFTER flores_sugeridas;
-- ALTER TABLE registro_recomendaciones ADD INDEX idx_creado_en (creado_en);
