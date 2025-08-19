#!/usr/bin/env bash
set -euo pipefail
API_BASE="${API_BASE:-http://localhost:8080}"
echo "GET /api/prompts"
LIST=$(curl -fsS "$API_BASE/api/prompts")
echo "$LIST" | jq '.prompts | length'
ID=$(echo "$LIST" | jq -r '.prompts[0].id // empty')
if [ -n "$ID" ]; then
  echo "GET /api/prompts/$ID"
  curl -fsS "$API_BASE/api/prompts/$ID" | jq '{id, hasRaw: (.raw|length>0), hasTemplate: (.template!=null)}'
else
  echo "No prompts present."
fi
