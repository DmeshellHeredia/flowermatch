# FlowerMatch

Recomendador de flores con NLP. El usuario describe la ocasión en texto libre y recibe sugerencias con la intención detectada. Lo más interesante del proyecto no es el catálogo sino la arquitectura de fallback en tres capas (Python → PHP → TypeScript local) con degradación explícita: si MySQL falla, el sistema lo indica en la respuesta en lugar de devolver vacío sin explicación.

> Demo funcional pensada para mostrar criterio técnico. No es un sistema listo para producción.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js (App Router) · React · TypeScript · Tailwind CSS v4 |
| Backend | PHP 8.1+ · PDO · MySQL 8 |
| NLP | Python 3.10+ · TF-IDF (stdlib, sin dependencias externas) |
| Testing | Vitest · Testing Library · unittest (Python) |

## Funcionalidades

- **Recomendador** — detecta 14 intenciones en texto libre (romance, disculpa, luto, cumpleaños...). Usa TF-IDF en Python; si Python no responde, cae al fallback PHP; si el backend no está disponible, el navegador usa datos estáticos locales.
- **Catálogo** — filtros por color, ocasión, precio y texto. Paginación y ordenación.
- **Panel de administración** — CRUD completo protegido con JWT y CSRF. Rate limiting en login (5 intentos / 10 min).
- **Carrito y favoritos** — persistidos en localStorage. Checkout simulado.
- **Dark mode** — toggle en navbar, persistido entre sesiones.

## Fallback y degradación

Las tres capas no son igualmente independientes:

| Capa | Requiere | Qué devuelve |
|------|----------|--------------|
| Python (TF-IDF) | Python instalado + MySQL | Flores del catálogo real con scoring NLP |
| PHP (reglas) | Backend PHP corriendo + MySQL | Flores del catálogo real con reglas de intención |
| TS local | Nada externo | 12 flores estáticas embebidas en el bundle |

Python y PHP comparten MySQL como dependencia. Un fallo de base de datos inutiliza las dos primeras capas al mismo tiempo; el único fallback realmente independiente es el local.

Cuando MySQL falla durante una petición, la respuesta incluye `degradado: true`. Esto permite distinguir dos situaciones que de otra forma parecen iguales:

| `flores` | `degradado` | Causa |
|----------|-------------|-------|
| `[]` | ausente | No hay flores para esa intención (resultado válido) |
| `[]` | `true` | MySQL no respondió (fallo del sistema) |

El frontend muestra un aviso ámbar solo en el segundo caso.

## Decisiones técnicas

**PHP sin framework** — La API es PHP puro con PDO. Quería escribir SQL a mano y manejar CORS explícitamente, no delegarlo a un framework.

**Python para NLP** — TF-IDF con `math` y `unicodedata` de la stdlib, sin dependencias externas. Python se invoca como subproceso desde PHP (`proc_open`) con timeout de 5 segundos.

**JSON compartidos entre capas** — Intenciones, palabras clave y mensajes viven en `shared/recomendador/*.json`. Python los carga en runtime, PHP los usa como fallback, y el TypeScript del frontend se genera con un script de Node. Cambiar una palabra clave en un JSON la actualiza en los tres entornos. Un check en `predev`/`prebuild` detecta desincronización antes de llegar a producción.

**JWT sin Composer** — Implementado con `hash_hmac` + base64url en PHP puro. En producción usaría `firebase/php-jwt`.

**Next.js App Router** — El catálogo es client-side porque depende de carrito, favoritos y fallback local; SSR no aporta aquí.

## Seguridad

**Autenticación** — JWT HS256 en cookie `httpOnly` o Bearer estático en desarrollo. CSRF con doble-submit cookie y `SameSite` adaptativo según el protocolo.

**Rate limiting** — ventana deslizante con archivos JSON y `flock`, sin Redis. Login: 5 intentos fallidos por IP cada 10 minutos. Rutas públicas y de admin con límites distintos.

**Validación** — todas las entradas pasan por funciones puras en `config/validacion.php` que retornan `tipo | false`: longitud, `strip_tags`, whitelist de colores, rango de precios, bloqueo de esquemas peligrosos en URLs de imagen.

## Estructura

```
FlowerMatch/
├── flowermatch/          # Frontend Next.js
├── backend-php/          # API REST (PHP puro)
├── python-ai/            # Módulo NLP (recomendador.py)
├── shared/recomendador/  # JSON compartidos entre las tres capas
├── database/             # schema.sql, datos.sql
└── scripts/              # generar-constantes-ts.js, check-datos-ts.js
```

## Instalación

El frontend funciona sin backend (datos estáticos, recomendador local). Para la demo completa con MySQL necesitas todos los componentes.

**Requisitos:** Node.js 18+, PHP 8.1+ (`pdo_mysql`), Python 3.10+, MySQL 8.

```bash
git clone https://github.com/DmeshellHeredia/FlowerMatch.git
cd FlowerMatch

# Base de datos
mysql -u root -p < database/schema.sql
mysql -u root -p flowermatch < database/datos.sql

# Variables de entorno
cp .env.example backend-php/.env   # editar DB_*, ADMIN_USER, ADMIN_PASSWORD_HASH
cp .env.example python-ai/.env     # editar DB_*

# Dependencias
cd flowermatch && npm install
cd ../python-ai && pip install -r requirements.txt
```

Ver `.env.example` para todos los valores requeridos. Para generar `ADMIN_PASSWORD_HASH`:
```bash
php -r "echo password_hash('tu_contraseña', PASSWORD_DEFAULT);"
```

## Ejecución

```bash
# Frontend (funciona solo, sin backend)
cd flowermatch && npm run dev          # http://localhost:3000

# Backend PHP (desde la raíz del proyecto)
php -S localhost:8080 -t backend-php

# Python se invoca automáticamente desde recomendar.php — no requiere proceso separado
# Para probar directamente: python3 python-ai/recomendador.py "flores para pedir perdón"
```

## Tests

~500 assertions distribuidos en tres lenguajes:

```bash
cd flowermatch && npm test                        # Vitest + Testing Library
php backend-php/tests/test_logica.php            # PHP lógica pura
python -m unittest discover python-ai/tests      # Python unittest
bash scripts/test-e2e-minimo.sh                  # 10 smoke tests HTTP (sin MySQL)
```

## API

Base URL: `http://localhost:8080`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/flores.php` | No | Lista flores. Params: `busqueda`, `color`, `ocasion`, `precio_min`, `precio_max`, `orden`, `page`, `limit` |
| `POST` | `/api/flores.php` | Sí | Crea una flor |
| `PUT` | `/api/flores.php?id=X` | Sí | Actualiza una flor |
| `DELETE` | `/api/flores.php?id=X` | Sí | Soft delete |
| `POST` | `/api/auth.php` | No | Login → cookie `fm_token` + `csrf_token` |
| `POST` | `/api/recomendar.php` | No | Body: `{ consulta }` → `{ intencion, contexto, flores, mensaje, modo }` |

**Ejemplo de respuesta del recomendador:**

```json
{
  "intencion": "disculpa",
  "contexto": "amistad",
  "flores": [{ "id": 7, "nombre": "Clavel Rosado", "precio": "18.00", ... }],
  "mensaje": "Para pedir perdón a un amigo, te recomendamos...",
  "modo": "python-nlp"
}
```

## Limitaciones

- **Rate limiting con archivos** — funciona para un proceso local; con múltiples instancias habría que pasar a Redis.
- **Python como subproceso** — arrancar un proceso por petición es lento. Para tráfico real lo habría expuesto como servicio HTTP desde el principio.
- **Sin roles de usuario** — hay un solo admin en `.env`. El panel cubre JWT y CRUD protegido; agregar roles habría duplicado la complejidad sin añadir nada nuevo al aprendizaje.
- **Checkout simulado** — solo UI. El modal lo indica antes de confirmar.

## ¿Por qué este stack?

Elegí PHP puro porque quería escribir SQL a mano y manejar CORS explícitamente, sin delegar eso a un framework. Para una API de este tamaño es suficiente y no tiene magia.

El recomendador en Python fue la parte que más me costó: entender por qué las frases prioritarias deben recibir un peso alto para evitar que "para mi novia" anule "pedir perdón" fue un problema real de diseño, no solo código.

Next.js lo elegí para trabajar con App Router: layouts anidados, estados de carga y TypeScript integrado sin configuración adicional. El catálogo termina siendo completamente client-side por el carrito y el fallback local, pero el framework aporta estructura desde el principio.

## ¿Qué aprendí?

- Sincronizar tres entornos (Python, PHP, JS) leyendo los mismos JSON sin duplicar lógica no es obvio. El script `generar-constantes-ts.js` fue la solución más simple que encontré.
- El doble-submit cookie para CSRF tiene más matices de los que parece (SameSite, cuándo eximir Bearer, HTTP vs HTTPS).
- `proc_open` en PHP es incómodo pero funciona. El timeout de 5 s evitó bloqueos reales durante el desarrollo.
- Implementar JWT desde cero en PHP hace que entiendas muy bien qué valida y qué no.

## ¿Qué haría diferente?

- **Python como servicio** — invocar `python recomendador.py` por request funciona pero es lento. Lo habría puesto como Flask desde el principio.
- **Más tests de integración** — los tests actuales son unitarios. Nunca puse un test que arranque el servidor PHP real y verifique el CORS.
- **Carrito persistido** — localStorage simplifica, pero complica cualquier feature posterior (historial, recuperación de sesión).

## Autor

**Michael Sanchez**
[michaelheredia60@gmail.com](mailto:michaelheredia60@gmail.com)
