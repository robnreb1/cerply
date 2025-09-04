#!/usr/bin/env bash
set -euo pipefail

STG="${STG:-https://cerply-staging.vercel.app}"
API="${API:-https://api-stg.cerply.com}"

# Optional Vercel protection bypass header
BYPASS_HEADER=()
if [[ -n "${VERCEL_BYPASS:-}" ]]; then
  BYPASS_HEADER=(-H "x-vercel-protection-bypass: $VERCEL_BYPASS")
else
  echo "==> VERCEL_BYPASS not set; protected endpoints may 401."
fi

echo "==> GET $STG/ping"
curl -sS -i "$STG/ping" ${BYPASS_HEADER[@]+"${BYPASS_HEADER[@]}"} | sed -n '1,20p'
echo

echo "==> GET $STG/api/health"
curl -sS -i "$STG/api/health" ${BYPASS_HEADER[@]+"${BYPASS_HEADER[@]}"} | sed -n '1,40p'
echo

echo "==> API health (direct)"
curl -sS -i "$API/api/health" | sed -n '1,40p'
echo

echo "==> Routes count (direct)"
curl -sS "$API/__routes.json" | jq '.routes | length'
echo

if [[ -n "${VERCEL_BYPASS:-}" ]]; then
  echo "==> GET $STG/api/prompts"
  curl -sS -i "$STG/api/prompts" ${BYPASS_HEADER[@]+"${BYPASS_HEADER[@]}"} | sed -n '1,40p'
  echo

  echo "==> POST $STG/api/ingest/preview"
  curl -sS -i -X POST "$STG/api/ingest/preview" ${BYPASS_HEADER[@]+"${BYPASS_HEADER[@]}"} \
    -H 'content-type: application/json' \
    --data '{"text":"Astrophysics for beginners, focus on cosmology, 45 mins"}' | sed -n '1,120p'
else
  echo "==> Skipping protected endpoints (/api/prompts, /api/ingest/preview)."
fi

# Assertions (fail fast if unhealthy)
jq -e '.ok==true' < <(curl -sS "$API/api/health") >/dev/null
test "$(curl -sS "$API/__routes.json" | jq '.routes | length')" -gt 0
if [[ -n "${VERCEL_BYPASS:-}" ]]; then
  jq -e 'type=="array" and length>0' < <(curl -sS "$STG/api/prompts" ${BYPASS_HEADER[@]+"${BYPASS_HEADER[@]}"} ) >/dev/null
fi
echo "Assertions passed."
