#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://localhost:8080}"
echo "==> Fresh DB E2E ($BASE) — migrate → seed → backfill → learn"

# Migrate
curl -s -D /tmp/m.h -o /tmp/m.json -X POST "$BASE/api/dev/migrate" >/dev/null || true
echo "migrate: $(jq -r '.ok, .db' /tmp/m.json 2>/dev/null || echo 'no-db')"

# Seed
curl -s -D /tmp/s.h -o /tmp/s.json -X POST "$BASE/api/dev/seed" >/dev/null || true
echo "seed: $(jq -r '.ok, .db' /tmp/s.json 2>/dev/null || echo 'no-db')"

# Backfill
curl -s -D /tmp/b.h -o /tmp/b.json -X POST "$BASE/api/dev/backfill/reviews" >/dev/null || true
echo "backfill: $(jq -r '.ok, .db' /tmp/b.json 2>/dev/null || echo 'no-db')"

# Learn next (DB preferred when present; header x-learn-source: db)
curl -s -D /tmp/ln.h -o /tmp/ln.json "$BASE/api/learn/next?planId=Demo%20Pack" >/dev/null || true
src=$(grep -i '^x-learn-source:' /tmp/ln.h || true)
echo "learn source header: ${src:-none}"
( jq . /tmp/ln.json 2>/dev/null || echo '{}' ) >/dev/null
echo "OK: script completed"


