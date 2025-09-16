#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://localhost:8080}"

echo "==> Chat acceptance against $BASE"

resp="$(curl -sS -D /tmp/hc.txt -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"Plan my GCSE Physics"}]}' \
  "$BASE/api/chat")"
jq -e '.action=="clarify" or .action=="plan"' >/dev/null <<<"$resp"
grep -i '^x-api: chat-orchestrate' /tmp/hc.txt >/dev/null
grep -i '^x-planner:' /tmp/hc.txt >/dev/null

dup='{"messages":[{"role":"user","content":"Plan my GCSE Physics"}]}'
curl -sS -H 'content-type: application/json' -d "$dup" "$BASE/api/chat" >/dev/null
sleep 1
curl -sS -H 'content-type: application/json' -d "$dup" "$BASE/api/chat" | jq -e '.action=="meta"' >/dev/null

echo "OK: chat acceptance passed."


