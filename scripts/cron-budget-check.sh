#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-https://cerply-api-staging-latest.onrender.com}"
echo "==> Budget alarm @ $BASE"
resp="$(curl -s -D /tmp/alarm.h "$BASE/api/ledger/alarm")"
echo "$resp" | jq
jq -e '.ok==true' <<<"$resp" >/dev/null
over="$(jq -r '.over' <<<"$resp")"
if [ "$over" = "true" ]; then
  echo "ALARM: budget breached (24h)"; exit 2
else
  echo "OK: under threshold"; exit 0
fi


