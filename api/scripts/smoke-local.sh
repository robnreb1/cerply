#!/usr/bin/env bash
set -euo pipefail
API_BASE="${API_BASE:-http://localhost:8080}"

echo "[smoke] /api/health"
curl -fsS "$API_BASE/api/health" | jq .

echo "[smoke] /api/chat (plan)"
curl -fsS -X POST "$API_BASE/api/chat" \
  -H 'content-type: application/json' \
  --data '{"messages":[{"role":"user","content":"GCSE German AQA Higher"}]}' | jq '{action}'

echo "[smoke] /api/analytics/record"
curl -fsS -X POST "$API_BASE/api/analytics/record" \
  -H 'content-type: application/json' \
  --data '{"kind":"smoke","ts":"'"$(date -Iseconds)"'"}' | jq .

echo "[smoke] done"


