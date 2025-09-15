#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://localhost:8080}"

echo "==> DB fresh acceptance against $BASE"

# 1) Health (ok if missing locally)
curl -s -D /tmp/dbh.txt "$BASE/api/db/health" >/tmp/dbh.json || true
grep -Eiq '^HTTP/.* 200' /tmp/dbh.txt || echo "WARN: /api/db/health not 200 (dev/local env?)"

# 2) Seed (idempotent)
one="$(curl -s -X POST "$BASE/api/dev/seed" || true)"
two="$(curl -s -X POST "$BASE/api/dev/seed" || true)"

# 3) Status and invariants
st="$(curl -s "$BASE/api/dev/seed-status" || echo '{}')"
echo "$st" | jq -e '.ok==true' >/dev/null
plans="$(echo "$st" | jq -r '.counts.plans // 0')"
mods="$(echo "$st" | jq -r '.counts.modules // 0')"
its="$(echo "$st" | jq -r '.counts.items // 0')"

test "${mods:-0}" -ge 3
test "${its:-0}" -ge 10

echo "OK: DB fresh acceptance passed."

