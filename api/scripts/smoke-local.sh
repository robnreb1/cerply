#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8080}"
TMP_CHAT="$(mktemp)"
trap 'rm -f "$TMP_CHAT"' EXIT

# small helper for curl timeouts
curl_json() {
  curl --connect-timeout 2 --max-time 10 -fsS "$@"
}

echo "[smoke] wait for /api/health"
for i in {1..20}; do
  if curl_json "$API_BASE/api/health" | jq . && break; then :; fi
  sleep 0.5
  if [[ $i -eq 20 ]]; then
    echo "health never became ready"; exit 1
  fi
done

echo "[smoke] /api/chat (plan)"
status=$(curl --connect-timeout 2 --max-time 15 -sS -o "$TMP_CHAT" -w '%{http_code}' \
  -X POST "$API_BASE/api/chat" -H 'content-type: application/json' \
  --data '{"messages":[{"role":"user","content":"GCSE German AQA Higher"}]}' )

if [[ "$status" == "200" || "$status" == "503" ]]; then
  jq '{action} // {error}' "$TMP_CHAT"
else
  echo "Unexpected status: $status"
  cat "$TMP_CHAT"
  exit 1
fi

echo "[smoke] /api/analytics/record"
curl_json -X POST "$API_BASE/api/analytics/record" \
  -H 'content-type: application/json' \
  --data '{"kind":"smoke","ts":"'"$(date -Iseconds)"'"}' | jq .

echo "[smoke] done"