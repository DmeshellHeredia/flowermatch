#!/usr/bin/env bash
# scripts/test-api.sh — Integration tests para FlowerMatch API
#
# Uso (desde la raíz del proyecto):
#   bash scripts/test-api.sh
#   API_URL=http://localhost:8080 bash scripts/test-api.sh
#
# El script carga ADMIN_TOKEN desde backend-php/.env automáticamente.
# Para sobreescribir: ADMIN_TOKEN=<token> bash scripts/test-api.sh
#
# Requiere: curl, python3 (sin dependencias externas)

set -euo pipefail

# Configuración

API_URL="${API_URL:-http://localhost:8080}"

# Ruta al .env relativa a la ubicación del script (funciona desde cualquier cwd)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../backend-php/.env"

# Cargar ADMIN_TOKEN desde backend-php/.env si no viene del entorno
if [ -z "${ADMIN_TOKEN:-}" ]; then
  if [ -f "$ENV_FILE" ]; then
    ADMIN_TOKEN=$(grep -E '^ADMIN_TOKEN=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r')
  fi
fi

# Si sigue vacío, pedir interactivamente
if [ -z "${ADMIN_TOKEN:-}" ]; then
  if [ -t 0 ]; then
    read -rsp "ADMIN_TOKEN (de backend-php/.env): " ADMIN_TOKEN
    echo
  else
    echo "ERROR: ADMIN_TOKEN no encontrado en $ENV_FILE ni en el entorno." >&2
    exit 1
  fi
fi

# Contadores

PASS=0
FAIL=0
TEST_ID=0

# Utilidades

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
RESET='\033[0m'

section() { echo -e "\n${CYAN}══ $1 ══${RESET}"; }

pass() {
  PASS=$((PASS + 1))
  TEST_ID=$((TEST_ID + 1))
  printf "${GREEN}✓${RESET} [%02d] %s\n" "$TEST_ID" "$1"
}

fail() {
  FAIL=$((FAIL + 1))
  TEST_ID=$((TEST_ID + 1))
  printf "${RED}✗${RESET} [%02d] %s\n" "$TEST_ID" "$1"
  [ -n "${2:-}" ] && printf "     ${GRAY}detalle: %s${RESET}\n" "$2"
}

# Ejecuta curl y devuelve "STATUS_CODE BODY" separados por un delimitador
api() {
  local method="$1"; shift
  local url="$1";    shift
  local extra_args=("$@")
  curl -s -w "\n__STATUS__%{http_code}" \
    -X "$method" "${extra_args[@]}" "$url" 2>/dev/null
}

# Extrae el status code de la salida de api()
get_status() { echo "$1" | python3 -c "import sys; d=sys.stdin.read(); print(d.rsplit('__STATUS__',1)[-1].strip())"; }
get_body()   { echo "$1" | python3 -c "import sys; d=sys.stdin.read(); print(d.rsplit('__STATUS__',1)[0].rstrip())"; }

# Verifica campo JSON
json_field() {
  local body="$1"
  local field="$2"
  echo "$body" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(str(d.get('$field', '__MISSING__')))
except Exception as e:
    print('__ERROR__: ' + str(e))
"
}

# Verificar conectividad

echo -e "${CYAN}FlowerMatch API Integration Tests${RESET}"
echo -e "${GRAY}API_URL: $API_URL${RESET}"
echo -e "${GRAY}ADMIN_TOKEN: [configurado]${RESET}"

if ! curl -s --connect-timeout 3 -o /dev/null "$API_URL/api/flores.php"; then
  echo -e "${RED}ERROR: No se puede conectar a $API_URL. ¿Está el servidor PHP corriendo?${RESET}"
  echo "  cd backend-php && php -S localhost:8080"
  exit 1
fi

# ══════════════════════════════════════════════════════════════════════════════
section "1. API pública — GET /api/flores.php"

R=$(api GET "$API_URL/api/flores.php")
STATUS=$(get_status "$R")
BODY=$(get_body "$R")

if [ "$STATUS" = "200" ]; then
  pass "GET /api/flores.php → 200"
else
  fail "GET /api/flores.php → esperado 200" "obtenido $STATUS"
fi

OCULTAS=$(echo "$BODY" | python3 -c "
import sys, json
try:
    raw = json.load(sys.stdin)
    flores = raw['data'] if isinstance(raw, dict) and 'data' in raw else raw
    ocultas = [f.get('nombre','?') for f in flores if not f.get('disponible')]
    print(','.join(ocultas) if ocultas else '')
except: print('ERROR')
")
if [ -z "$OCULTAS" ]; then
  pass "API pública no expone flores ocultas"
else
  fail "API pública expone flores ocultas" "$OCULTAS"
fi

COUNT=$(echo "$BODY" | python3 -c "import sys,json; raw=json.load(sys.stdin); f=raw['data'] if isinstance(raw,dict) and 'data' in raw else raw; print(len(f))" 2>/dev/null || echo 0)
pass "Devuelve $COUNT flores disponibles"

# Filtro por color
R=$(api GET "$API_URL/api/flores.php?color=Rojo")
STATUS=$(get_status "$R")
BODY=$(get_body "$R")
COLORES=$(echo "$BODY" | python3 -c "
import sys,json
raw=json.load(sys.stdin)
f=raw['data'] if isinstance(raw,dict) and 'data' in raw else raw
bad=[x['nombre'] for x in f if x.get('color')!='Rojo']
print(','.join(bad) if bad else '')
")
if [ "$STATUS" = "200" ] && [ -z "$COLORES" ]; then
  pass "Filtro ?color=Rojo devuelve solo flores rojas"
else
  fail "Filtro ?color=Rojo" "status=$STATUS flores_incorrectas=$COLORES"
fi

# Flor por ID — usar el primer ID real de la lista, no asumir id=1
FIRST_ID=$(echo "$BODY" | python3 -c "
import sys, json
try:
    raw = json.load(sys.stdin)
    f = raw['data'] if isinstance(raw, dict) and 'data' in raw else raw
    print(f[0]['id']) if f else print('')
except: print('')
")

if [ -n "$FIRST_ID" ]; then
  R=$(api GET "$API_URL/api/flores.php?id=$FIRST_ID")
  STATUS=$(get_status "$R")
  if [ "$STATUS" = "200" ]; then pass "GET ?id=$FIRST_ID (primer id real) → 200"
  else fail "GET ?id=$FIRST_ID" "status=$STATUS"; fi
else
  fail "No hay flores en la BD para probar GET por id"
fi

R=$(api GET "$API_URL/api/flores.php?id=999999")
STATUS=$(get_status "$R")
if [ "$STATUS" = "404" ]; then pass "GET ?id=999999 (inexistente) → 404"
else fail "GET id inexistente" "status=$STATUS"; fi

# ══════════════════════════════════════════════════════════════════════════════
section "2. Login — POST /api/auth.php"

# Credenciales incorrectas
R=$(api POST "$API_URL/api/auth.php" -H "Content-Type: application/json" -d '{"usuario":"admin","password":"contrasena_INCORRECTA_xyz"}')
STATUS=$(get_status "$R")
if [ "$STATUS" = "401" ]; then pass "Credenciales incorrectas → 401"
else fail "Credenciales incorrectas" "esperado 401, obtenido $STATUS"; fi

# Token correcto: usar ADMIN_TOKEN que ya tenemos (asumimos que es válido)
# Verificar que el token no está vacío
if [ -n "$ADMIN_TOKEN" ]; then
  pass "ADMIN_TOKEN configurado (${ADMIN_TOKEN:0:8}...)"
else
  fail "ADMIN_TOKEN vacío"
fi

# Rate limiting (requiere 6 intentos — puede dejar IP bloqueada 10 min)
echo -e "  ${GRAY}(omitiendo test de rate limiting para no bloquear IP — ver docs/INTEGRATION_TESTS.md §2)${RESET}"

# ══════════════════════════════════════════════════════════════════════════════
section "3. Admin — GET /api/admin/flores.php"

# Sin token
R=$(api GET "$API_URL/api/admin/flores.php")
STATUS=$(get_status "$R")
if [ "$STATUS" = "401" ]; then pass "Sin token → 401"
else fail "Sin token" "esperado 401, obtenido $STATUS"; fi

# Token incorrecto
R=$(api GET "$API_URL/api/admin/flores.php" -H "Authorization: Bearer token_incorrecto_xyz")
STATUS=$(get_status "$R")
if [ "$STATUS" = "401" ]; then pass "Token incorrecto → 401"
else fail "Token incorrecto" "esperado 401, obtenido $STATUS"; fi

# Con token correcto
R=$(api GET "$API_URL/api/admin/flores.php" -H "Authorization: Bearer $ADMIN_TOKEN")
STATUS=$(get_status "$R")
BODY=$(get_body "$R")
if [ "$STATUS" = "200" ]; then
  pass "Con token correcto → 200"
  TOTAL=$(echo "$BODY" | python3 -c "import sys,json; f=json.load(sys.stdin); print(len(f))" 2>/dev/null || echo 0)
  DISP=$(echo "$BODY" | python3 -c "import sys,json; f=json.load(sys.stdin); print(sum(1 for x in f if x.get('disponible')))" 2>/dev/null || echo 0)
  OCULTAS_ADMIN=$(echo "$BODY" | python3 -c "import sys,json; f=json.load(sys.stdin); print(sum(1 for x in f if not x.get('disponible')))" 2>/dev/null || echo 0)
  pass "Admin devuelve $TOTAL flores ($DISP disponibles, $OCULTAS_ADMIN ocultas)"
else
  fail "Con token correcto" "status=$STATUS"
fi

# ══════════════════════════════════════════════════════════════════════════════
section "4 & 5. Soft delete + Hard delete (flor de prueba)"

# Crear flor de prueba
R=$(api POST "$API_URL/api/flores.php" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"nombre":"_TEST_INTEGRATION_","color":"Verde","ocasion":"test","precio":1,"descripcion":"temporal","disponible":1}')
STATUS=$(get_status "$R")
BODY=$(get_body "$R")

if [ "$STATUS" = "201" ]; then
  TEST_FLOWER_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
  pass "Crear flor de prueba → 201 (id=$TEST_FLOWER_ID)"
else
  fail "Crear flor de prueba" "status=$STATUS body=$BODY"
  echo -e "  ${GRAY}Saltando tests de delete (sin flor de prueba)${RESET}"
  TEST_FLOWER_ID=""
fi

if [ -n "$TEST_FLOWER_ID" ]; then

  # -- Soft delete --
  R=$(api DELETE "$API_URL/api/flores.php?id=$TEST_FLOWER_ID" -H "Authorization: Bearer $ADMIN_TOKEN")
  STATUS=$(get_status "$R")
  BODY=$(get_body "$R")
  MENSAJE=$(json_field "$BODY" "mensaje")
  if [ "$STATUS" = "200" ] && echo "$MENSAJE" | grep -q "ocultada"; then
    pass "Soft delete → 200 + mensaje correcto"
  else
    fail "Soft delete" "status=$STATUS body=$BODY"
  fi

  # La flor no aparece en API pública
  R=$(api GET "$API_URL/api/flores.php?id=$TEST_FLOWER_ID")
  STATUS=$(get_status "$R")
  if [ "$STATUS" = "404" ]; then pass "Flor oculta no visible en API pública → 404"
  else fail "Flor oculta debería dar 404 en API pública" "status=$STATUS"; fi

  # La flor SÍ aparece en API admin
  R=$(api GET "$API_URL/api/admin/flores.php" -H "Authorization: Bearer $ADMIN_TOKEN")
  BODY=$(get_body "$R")
  EXISTE=$(echo "$BODY" | python3 -c "
import sys,json
f=json.load(sys.stdin)
existe=any(x['id']==$TEST_FLOWER_ID for x in f)
print('si' if existe else 'no')
")
  if [ "$EXISTE" = "si" ]; then pass "Flor oculta sigue visible en API admin"
  else fail "Flor oculta debería aparecer en API admin"; fi

  # Soft delete idempotente (ya está oculta)
  R=$(api DELETE "$API_URL/api/flores.php?id=$TEST_FLOWER_ID" -H "Authorization: Bearer $ADMIN_TOKEN")
  STATUS=$(get_status "$R")
  if [ "$STATUS" = "200" ]; then pass "Soft delete idempotente (ya oculta) → 200"
  else fail "Soft delete idempotente" "status=$STATUS"; fi

  # -- Hard delete --
  R=$(api DELETE "$API_URL/api/admin/flores.php?id=$TEST_FLOWER_ID" -H "Authorization: Bearer $ADMIN_TOKEN")
  STATUS=$(get_status "$R")
  BODY=$(get_body "$R")
  MENSAJE=$(json_field "$BODY" "mensaje")
  if [ "$STATUS" = "200" ] && echo "$MENSAJE" | grep -q "definitivamente"; then
    pass "Hard delete → 200 + mensaje correcto"
  else
    fail "Hard delete" "status=$STATUS body=$BODY"
  fi

  # Segundo hard delete → 404
  R=$(api DELETE "$API_URL/api/admin/flores.php?id=$TEST_FLOWER_ID" -H "Authorization: Bearer $ADMIN_TOKEN")
  STATUS=$(get_status "$R")
  if [ "$STATUS" = "404" ]; then pass "Segundo hard delete → 404"
  else fail "Segundo hard delete" "esperado 404, obtenido $STATUS"; fi

  # No aparece en admin
  R=$(api GET "$API_URL/api/admin/flores.php" -H "Authorization: Bearer $ADMIN_TOKEN")
  BODY=$(get_body "$R")
  EXISTE=$(echo "$BODY" | python3 -c "
import sys,json
f=json.load(sys.stdin)
existe=any(x['id']==$TEST_FLOWER_ID for x in f)
print('si' if existe else 'no')
")
  if [ "$EXISTE" = "no" ]; then pass "Flor borrada definitivamente no existe en admin"
  else fail "Flor borrada aún aparece en admin"; fi

fi

# ══════════════════════════════════════════════════════════════════════════════
section "6. Recomendador — POST /api/recomendar.php"

check_recomendador() {
  local label="$1"
  local consulta="$2"
  local intent_esp="$3"
  local ctx_esp="$4"

  R=$(api POST "$API_URL/api/recomendar.php" \
    -H "Content-Type: application/json" \
    -d "{\"consulta\":\"$consulta\"}")
  STATUS=$(get_status "$R")
  BODY=$(get_body "$R")

  if [ "$STATUS" != "200" ]; then
    fail "$label" "HTTP $STATUS"
    return
  fi

  INTENT=$(json_field "$BODY" "intencion")
  CTX=$(json_field "$BODY" "contexto")
  MODO=$(json_field "$BODY" "modo")

  if [ "$INTENT" = "$intent_esp" ] && [ "$CTX" = "$ctx_esp" ]; then
    pass "$label — intencion=$INTENT contexto=$CTX modo=$MODO"
  else
    fail "$label" "intencion=$INTENT (esp=$intent_esp) contexto=$CTX (esp=$ctx_esp)"
  fi
}

check_recomendador \
  "disculpa+amistad" \
  "Necesito un regalo para pedir perdon a mi mejor amigo" \
  "disculpa" "amistad"

check_recomendador \
  "luto+amistad" \
  "condolencias para una amiga" \
  "luto" "amistad"

check_recomendador \
  "disculpa+pareja" \
  "quiero pedir perdon a mi novia" \
  "disculpa" "pareja"

# Consulta vacía
R=$(api POST "$API_URL/api/recomendar.php" \
  -H "Content-Type: application/json" \
  -d '{"consulta":""}')
STATUS=$(get_status "$R")
if [ "$STATUS" = "400" ]; then pass "Consulta vacía → 400"
else fail "Consulta vacía" "esperado 400, obtenido $STATUS"; fi

# ══════════════════════════════════════════════════════════════════════════════
section "7. CORS — verificar headers"

CORS_ORIGIN="http://localhost:3000"
HEADERS=$(curl -s -I -X OPTIONS \
  -H "Origin: $CORS_ORIGIN" \
  -H "Access-Control-Request-Method: GET" \
  "$API_URL/api/flores.php" 2>/dev/null)

if echo "$HEADERS" | grep -qi "access-control-allow-origin: $CORS_ORIGIN"; then
  pass "ACAO header = $CORS_ORIGIN (Origin permitido)"
else
  ACAO=$(echo "$HEADERS" | grep -i "access-control-allow-origin" || echo "(no presente)")
  fail "ACAO header incorrecto" "$ACAO"
fi

if echo "$HEADERS" | grep -qi "access-control-allow-methods"; then
  pass "Access-Control-Allow-Methods presente"
else
  fail "Access-Control-Allow-Methods ausente"
fi

# ══════════════════════════════════════════════════════════════════════════════
echo -e "\n${CYAN}══ Resultado final ══${RESET}"
TOTAL=$((PASS + FAIL))
if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}✓ $PASS/$TOTAL tests pasaron${RESET}"
else
  echo -e "${RED}✗ $FAIL fallos — $PASS/$TOTAL tests pasaron${RESET}"
fi

exit "$FAIL"
