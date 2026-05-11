#!/usr/bin/env bash
# scripts/test-e2e-minimo.sh — Smoke tests HTTP FlowerMatch
#
# Levanta un servidor PHP built-in, corre 10 checks y lo apaga solo.
# Requiere: bash, curl, python3, MySQL corriendo con las credenciales de backend-php/.env
#
# Uso:
#   bash scripts/test-e2e-minimo.sh
#   PORT=18080 bash scripts/test-e2e-minimo.sh

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PHP="${PHP:-$(command -v php 2>/dev/null || echo '/c/xampp/php/php')}"
PORT="${PORT:-17474}"
BASE="http://localhost:$PORT"
LOG="$ROOT/backend-php/logs/php-builtin.log"

GREEN='\033[0;32m'; RED='\033[0;31m'; CYAN='\033[0;36m'; GRAY='\033[0;90m'; RESET='\033[0m'
PASS=0; FAIL=0

ok()  { PASS=$((PASS+1)); printf "${GREEN}✓${RESET} %s\n" "$1"; }
fail(){ FAIL=$((FAIL+1)); printf "${RED}✗${RESET} %s\n" "$1"; [ -n "${2:-}" ] && printf "  ${GRAY}%s${RESET}\n" "$2"; }

# ── servidor ──────────────────────────────────────────────────────────────────
SERVER_PID=""
cleanup() { [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true; }
trap cleanup EXIT

mkdir -p "$ROOT/backend-php/logs"
"$PHP" -S "localhost:$PORT" -t "$ROOT/backend-php/api" >"$LOG" 2>&1 &
SERVER_PID=$!

# Esperar readiness (hasta 10 s)
READY=0
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  if curl -s --connect-timeout 0.5 "$BASE/health.php" -o /dev/null 2>/dev/null; then
    READY=1; break
  fi
  sleep 0.5
done
[ "$READY" -eq 1 ] || { printf "${RED}ERROR: servidor no levantó en 10 s${RESET}\n" >&2; exit 1; }

printf "${CYAN}FlowerMatch — Smoke E2E${RESET}  (php -S localhost:$PORT)\n\n"

# ── helpers ───────────────────────────────────────────────────────────────────
call() {
  local method="$1" path="$2"; shift 2
  curl -s -w "\n__STATUS__%{http_code}" -X "$method" "$@" "$BASE$path" 2>/dev/null
}
get_status(){ printf '%s' "$1" | python3 -c "import sys; d=sys.stdin.read(); print(d.rsplit('__STATUS__',1)[-1].strip())"; }
get_body(){   printf '%s' "$1" | python3 -c "import sys; d=sys.stdin.read(); print(d.rsplit('__STATUS__',1)[0].rstrip())"; }
has_key(){
  printf '%s' "$2" | python3 -c "
import sys, json
try:
  print('yes' if '$1' in json.load(sys.stdin) else 'no')
except Exception:
  print('no')
" 2>/dev/null
}

# ── 1: health ─────────────────────────────────────────────────────────────────
R=$(call GET /health.php)
S=$(get_status "$R")
if [[ "$S" == "200" || "$S" == "503" ]]; then
  ok "GET /health.php → $S (JSON con status+checks)"
else
  fail "GET /health.php" "HTTP $S — $(get_body "$R")"
fi

# ── 2: listado flores ─────────────────────────────────────────────────────────
R=$(call GET /flores.php)
S=$(get_status "$R")
B=$(get_body "$R")
if [ "$S" = "200" ] && [ "$(has_key data "$B")" = "yes" ] && [ "$(has_key total "$B")" = "yes" ]; then
  ok "GET /flores.php → 200 {data, total}"
else
  fail "GET /flores.php" "HTTP $S — $B"
fi

# ── 3: precio_min negativo → 400 ─────────────────────────────────────────────
R=$(call GET "/flores.php?precio_min=-1")
S=$(get_status "$R")
[ "$S" = "400" ] && ok "GET /flores.php?precio_min=-1 → 400" \
                 || fail "precio_min=-1 debería ser 400" "HTTP $S"

# ── 4: precio_min > PRECIO_FILTRO_MAX (100 000) → 400 ────────────────────────
R=$(call GET "/flores.php?precio_min=999999")
S=$(get_status "$R")
[ "$S" = "400" ] && ok "GET /flores.php?precio_min=999999 → 400" \
                 || fail "precio_min=999999 debería ser 400" "HTTP $S"

# ── 5: recomendar normal → 200 ────────────────────────────────────────────────
R=$(call POST /recomendar.php -H "Content-Type: application/json" -d '{"consulta":"flores para mi novia"}')
S=$(get_status "$R")
B=$(get_body "$R")
if [ "$S" = "200" ] && [ "$(has_key intencion "$B")" = "yes" ]; then
  ok "POST /recomendar.php → 200 {intencion, flores, mensaje}"
else
  fail "POST /recomendar.php" "HTTP $S — $B"
fi

# ── 6: recomendar consulta vacía → 400 ───────────────────────────────────────
R=$(call POST /recomendar.php -H "Content-Type: application/json" -d '{"consulta":""}')
S=$(get_status "$R")
[ "$S" = "400" ] && ok 'POST /recomendar.php consulta="" → 400' \
                 || fail "recomendar vacío debería ser 400" "HTTP $S"

# ── 7: recomendar consulta > 500 chars → 400 ─────────────────────────────────
LARGA=$(python3 -c "print('a'*501)")
R=$(call POST /recomendar.php -H "Content-Type: application/json" -d "{\"consulta\":\"$LARGA\"}")
S=$(get_status "$R")
[ "$S" = "400" ] && ok "POST /recomendar.php (501 chars) → 400" \
                 || fail "recomendar >500 chars debería ser 400" "HTTP $S"

# ── 8: admin sin auth → 401 ──────────────────────────────────────────────────
R=$(call GET /admin/flores.php)
S=$(get_status "$R")
[ "$S" = "401" ] && ok "GET /admin/flores.php sin auth → 401" \
                 || fail "admin sin auth debería ser 401" "HTTP $S"

# ── 9: preflight CORS → Access-Control headers presentes ─────────────────────
HDRS=$(curl -sI -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  "$BASE/flores.php" 2>/dev/null)
if printf '%s' "$HDRS" | grep -qi "Access-Control-Allow"; then
  ok "OPTIONS /flores.php → headers CORS presentes"
else
  fail "OPTIONS preflight" "$(printf '%s' "$HDRS" | head -1)"
fi

# ── 10: método no permitido → 405 ────────────────────────────────────────────
R=$(call DELETE /health.php)
S=$(get_status "$R")
[ "$S" = "405" ] && ok "DELETE /health.php → 405" \
                 || fail "DELETE /health.php debería ser 405" "HTTP $S"

# ── resultado ─────────────────────────────────────────────────────────────────
echo
TOTAL=$((PASS + FAIL))
if [ "$FAIL" -eq 0 ]; then
  printf "${GREEN}✓ %d/%d smoke checks pasaron${RESET}\n" "$PASS" "$TOTAL"
else
  printf "${RED}✗ %d fallo(s) de %d${RESET}\n" "$FAIL" "$TOTAL"
fi

exit "$FAIL"
