#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://localhost:8080}"
PLAN="${PLAN:-demo-pack}"

echo "==> Learn (DB-aware) acceptance against $BASE (plan=$PLAN)"

# Seed is optional; no-op if no DB bound
curl -s -X POST "$BASE/api/dev/seed" >/dev/null || true

# 1) Next: must return an item; capture source header
resp="$(curl -s -D /tmp/ldb.h "$BASE/api/learn/next?planId=$PLAN")"
jq -e '.itemId and .stem and .dueAt' >/dev/null <<<"$resp"
src="$(grep -i '^x-learn-source:' /tmp/ldb.h | awk -F': ' '{print tolower($2)}' | tr -d '\r' || true)"
echo "source=${src:-unknown}"

# 2) Submit: use debugAnswerIndex if present
iid="$(jq -r .itemId <<<"$resp")"
ans="$(jq -r '.debugAnswerIndex // 0' <<<"$resp")"
out="$(curl -s -H 'content-type: application/json' \
  -d '{"itemId":"'"$iid"'","answerIndex":'"$ans"',"responseTimeMs":4000,"planId":"'"$PLAN"'"}' \
  "$BASE/api/learn/submit")"
jq -e '.ok==true and .result.nextReviewAt and (.result.correct|type=="boolean")' >/dev/null <<<"$out"

echo "OK: learn DB-aware acceptance passed."

