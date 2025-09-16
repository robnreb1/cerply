#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://localhost:8080}"
echo "==> Observability acceptance @ $BASE"

# Seed two events
curl -s -H 'content-type: application/json' -d '{"type":"ingest.preview","payload":{"ok":true}}' "$BASE/api/analytics/event" >/dev/null
curl -s -H 'content-type: application/json' -d '{"type":"learn.submit","payload":{"correct":1}}' "$BASE/api/analytics/event" >/dev/null

# Pilot should be DB-backed with windowHours=24
pil=$(curl -s -D /tmp/pil.h "$BASE/api/analytics/pilot")
grep -i '^x-api: analytics-pilot' /tmp/pil.h >/dev/null
jq -e '.ok==true and .db==true and .windowHours==24' <<<"$pil" >/dev/null

# CSVs present with x-api headers
curl -s -D /tmp/ec.h "$BASE/api/analytics/events.csv" | head -n 1 >/dev/null
grep -i '^x-api: analytics-events-csv' /tmp/ec.h >/dev/null
curl -s -D /tmp/lc.h "$BASE/api/ledger/export.csv" | head -n 1 >/dev/null
grep -i '^x-api: ledger-export-csv' /tmp/lc.h >/dev/null

# Alarm should return ok:true (threshold may be disabled locally)
al=$(curl -s -D /tmp/al.h "$BASE/api/ledger/alarm")
grep -i '^x-api: ledger-alarm' /tmp/al.h >/dev/null
jq -e '.ok==true and .windowHours==24' <<<"$al" >/dev/null

echo "OK: observability acceptance passed"


