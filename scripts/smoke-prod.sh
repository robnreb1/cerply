#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-https://api.cerply.com}"

echo "PROD health…"
curl -fsS "$API_BASE/api/health" | jq .

echo "PROD db health…"
curl -fsS "$API_BASE/api/db/health" | jq . || true

echo "PROD clarify (should 200 if OPENAI configured, else MODEL_UNAVAILABLE)…"
curl -fsS -X POST "$API_BASE/api/ingest/clarify" \
  -H 'content-type: application/json' \
  --data '{"question":"ping?","context":"smoke"}' | jq . || true
