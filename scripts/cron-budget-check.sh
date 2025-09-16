#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-https://cerply-api-staging.onrender.com}"
echo "==> Budget alarm @ $BASE"
resp="$(curl -s -D /tmp/alarm.h "$BASE/api/ledger/alarm")"
echo "$resp" | jq
# If route not present on this deployment, treat as no-op success
if jq -e '.error.code=="NOT_FOUND"' <<<"$resp" >/dev/null 2>&1; then
  echo "NOTE: /api/ledger/alarm not available on this BASE; skipping"; exit 0
fi

jq -e '.ok==true' <<<"$resp" >/dev/null
over="$(jq -r '.over' <<<"$resp")"
if [ "$over" = "true" ]; then
  echo "ALARM: budget breached (24h)"; exit 2
else
  echo "OK: under threshold"; exit 0
fi


