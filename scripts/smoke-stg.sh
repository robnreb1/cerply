#!/usr/bin/env bash
set -Eeuo pipefail

STG="${STG:-https://cerply-staging.vercel.app}"
API="${API:-https://api-stg.cerply.com}"

BYPASS_HEADER=()
if [[ "${VERCEL_BYPASS:-}" != "" ]]; then
  BYPASS_HEADER=(-H "x-vercel-protection-bypass: ${VERCEL_BYPASS}")
fi

echo "==> GET $STG/ping"
curl -sS -i "$STG/ping" | sed -n '1,20p'
echo

echo "==> GET $STG/api/health"
curl -sS -i "$STG/api/health" | sed -n '1,40p'
echo

echo "==> API health (direct)"
curl -sS -i "$API/api/health" | sed -n '1,40p'
echo

echo "==> Routes count (direct)"
curl -sS "$API/__routes.json" | jq '.routes | length'
echo

if [[ "${VERCEL_BYPASS:-}" != "" ]]; then
  echo "==> GET $STG/api/prompts"
  curl -sS -i "$STG/api/prompts" "${BYPASS_HEADER[@]:-}" | sed -n '1,60p'
  echo

  echo "==> POST $STG/api/ingest/preview"
  curl -sS -i -X POST "$STG/api/ingest/preview" \
    "${BYPASS_HEADER[@]:-}" \
    -H 'content-type: application/json' \
    --data '{"text":"Astrophysics for beginners, focus on cosmology, 45 mins"}' \
    | sed -n '1,120p'
  echo
else
  echo "==> Skipping protected endpoints (/api/prompts, /api/ingest/preview) because VERCEL_BYPASS is not set."
fi

# Assertions (fail fast if unhealthy)
jq -e '.ok==true' < <(curl -sS "$API/api/health") >/dev/null
echo "Assertions passed."
