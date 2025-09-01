#!/usr/bin/env bash
set -euo pipefail
STG="${STG:-https://cerply-staging.vercel.app}"
BYPASS="${VERCEL_BYPASS:-}"

hdr=(-sS -i)
if [[ -n "$BYPASS" ]]; then
  hdr+=(-H "x-vercel-protection-bypass: $BYPASS")
fi

echo "==> GET $STG/ping"
curl "${hdr[@]}" "$STG/ping" | sed -n '1,20p'

echo
echo "==> GET $STG/api/health"
curl "${hdr[@]}" "$STG/api/health" | sed -n '1,60p' | sed 's/^\r$//'

echo
echo "==> GET $Stg/api/prompts (expect 200 with fallback allowed)"
curl "${hdr[@]}" "$STG/api/prompts" | sed -n '1,120p' | sed 's/^\r$//'

echo
echo "==> POST $STG/api/ingest/preview (LLM planner path)"
curl "${hdr[@]}" -X POST "$STG/api/ingest/preview" \
  -H 'content-type: application/json' \
  --data '{"text":"Astrophysics for beginners, focus on cosmology, 45 mins"}' \
  | sed -n '1,180p' | sed 's/^\r$//'

echo
echo "==> Header check (x-edge, x-upstream if proxied)"
for path in "/api/health" "/api/prompts" "/api/ingest/preview"; do
  echo "-- $path"
  curl -sS -I "${hdr[@]:1}" "$STG$path" \
    | grep -i -E '^(x-edge|x-upstream|x-preview-impl|x-planner|x-model):' || true
done

echo
echo "Smoke complete."
