#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://localhost:8080}"
PLAN="${PLAN:-demo}"

echo "==> Learn acceptance against $BASE (plan=$PLAN)"

# 1) next returns an item with dueAt
resp="$(curl -s "$BASE/api/learn/next?planId=$PLAN")"
jq -e '.itemId and .stem and .dueAt' >/dev/null <<<"$resp"

# 2) submit (use debug answer if present; else pick 0)
iid="$(jq -r .itemId <<<"$resp")"
ans="$(jq -r '.debugAnswerIndex // 0' <<<"$resp")"
out="$(curl -s -H 'content-type: application/json' \
  -d '{"itemId":"'"$iid"'","answerIndex":'"$ans"',"responseTimeMs":4000,"planId":"'"$PLAN"'"}' \
  "$BASE/api/learn/submit")"
jq -e '.ok==true and .result.nextReviewAt' >/dev/null <<<"$out"

# 3) second submit (correct again) should not decrease strength
resp2="$(curl -s "$BASE/api/learn/next?planId=$PLAN")"
iid2="$(jq -r .itemId <<<"$resp2")"
ans2="$(jq -r '.debugAnswerIndex // 0' <<<"$resp2")"
out2="$(curl -s -H 'content-type: application/json' \
  -d '{"itemId":"'"$iid2"'","answerIndex":'"$ans2"',"responseTimeMs":5000,"planId":"'"$PLAN"'"}' \
  "$BASE/api/learn/submit")"
s1="$(jq -r .result.strength <<<"$out")"
s2="$(jq -r .result.strength <<<"$out2")"
awk -v a="$s1" -v b="$s2" 'BEGIN{ if (b+1e-9 < a) exit 1 }'

echo "OK: learn acceptance passed."


