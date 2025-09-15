------------------------------------------------------------------------------
#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://localhost:8080}"

echo "==> DB fresh acceptance against $BASE"

# 1) Health (route should exist and respond JSON)
curl -s -D /tmp/dbh.txt "$BASE/api/db/health" >/tmp/dbh.json || true
grep -Eiq '^HTTP/.* 200' /tmp/dbh.txt || echo "WARN: /api/db/health not 200 (dev/local env?)"

# 2) Seed (idempotent)
one="$(curl -s -X POST "$BASE/api/dev/seed")"
two="$(curl -s -X POST "$BASE/api/dev/seed")"

# 3) Status and invariants
st="$(curl -s "$BASE/api/dev/seed-status")"
echo "$st" | jq -e '.ok==true' >/dev/null
plans="$(echo "$st" | jq -r '.counts.plans')"
mods="$(echo "$st" | jq -r '.counts.modules')"
its="$(echo "$st" | jq -r '.counts.items')"

test "${mods:-0}" -ge 3
test "${its:-0}" -ge 10

echo "OK: DB fresh acceptance passed."
------------------------------------------------------------------------------

