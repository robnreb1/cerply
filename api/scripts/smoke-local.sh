#!/usr/bin/env bash
set -euo pipefail

# Staging smoke: accepts 200 (LLM on) or 503 (LLM disabled) from /api/chat
# Usage:
#   API_BASE="https://your-staging-api.example.com" bash scripts/smoke-stg.sh
# Defaults to $API_BASE or http://localhost:8080 if not provided.

API_BASE="${API_BASE:-http://localhost:8080}"
TMP_CHAT="$(mktemp)"
trap 'rm -f "$TMP_CHAT"' EXIT

# small helper for curl timeouts
curl_json() {
  curl --connect-timeout 2 --max-time 10 -fsS "$@"
}

echo "[smoke-stg] wait for /api/health @ $API_BASE"
for i in {1..40}; do
  if curl_json "$API_BASE/api/health" | jq . && break; then :; fi
  sleep 0.5
  if [[ $i -eq 40 ]]; then
    echo "health never became ready"; exit 1
  fi
done

echo "[smoke-stg] /api/chat (plan)"
status=$(curl --connect-timeout 2 --max-time 15 -sS -o "$TMP_CHAT" -w '%{http_code}' \
  -X POST "$API_BASE/api/chat" -H 'content-type: application/json' \
  --data '{"messages":[{"role":"user","content":"GCSE German AQA Higher"}]}' \
  || true)

# Accept 200 (live LLM) OR 503 (LLM disabled / key missing) for staging safety
if [[ "$status" == "200" || "$status" == "503" ]]; then
  # Print {action} when present, otherwise {error} for visibility
  jq '{action} // {error}' "$TMP_CHAT"
else
  echo "Unexpected status from /api/chat: $status"
  cat "$TMP_CHAT"
  exit 1
fi

echo "[smoke-stg] /api/analytics/ingest"
curl_json -X POST "$API_BASE/api/analytics/ingest" \
  -H 'content-type: application/json' \
  --data '{"events":[{"event":"plan_request","ts":"'"$(date -Iseconds)"'","anon_session_id":"smoke-test-session"}]}' | jq .

echo "[smoke-stg] done"

