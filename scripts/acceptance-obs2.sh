#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://localhost:8080}"

echo "==> Observability acceptance (obs2) against $BASE"

# 1) Routes dump present and db-health advertised
rd="$(curl -s "$BASE/__routes.json" || echo '{}')"
echo "$rd" | jq -e '.ok==true' >/dev/null
echo "hasDbHealth=$(echo "$rd" | jq -r '.hasDbHealth')"

# 2) Analytics pilot works (DB-aware)
pilot="$(curl -s "$BASE/api/analytics/pilot" || echo '{}')"
echo "$pilot" | jq -e '.ok==true and .windowHours==24' >/dev/null

# 3) Events CSV (DB-aware)
curl -s -D /tmp/events.h "$BASE/api/analytics/events.csv" | head -n 2 >/dev/null || true
grep -Eiq '^HTTP/.* 200' /tmp/events.h

# 4) Ledger CSV (DB-aware)
curl -s -D /tmp/ledger.h "$BASE/api/ledger/export.csv" | head -n 2 >/dev/null || true
grep -Eiq '^HTTP/.* 200' /tmp/ledger.h

# 5) Budget alarm (DB-aware; may be disabled if env not set)
alarm="$(curl -s "$BASE/api/ledger/alarm" || echo '{}')"
echo "$alarm" | jq -e '.ok==true' >/dev/null

echo "OK: Observability acceptance passed."


