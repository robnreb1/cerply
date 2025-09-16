#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://localhost:8080}"
echo "==> Persistence acceptance @ $BASE"

pre=$(curl -s "$BASE/api/dev/stats")
pA=$(jq -r '.counts.attempts // 0' <<<"$pre"); pR=$(jq -r '.counts.reviews // 0' <<<"$pre")

resp=$(curl -s "$BASE/api/learn/next?planId=Demo%20Pack")
iid=$(jq -r .itemId <<<"$resp"); ans=$(jq -r '.debugAnswerIndex // 0' <<<"$resp")

curl -s -D /tmp/sub.h -H 'content-type: application/json' \
  -d '{"itemId":"'"$iid"'","answerIndex":'"$ans"',"responseTimeMs":3000,"planId":"Demo Pack"}' \
  "$BASE/api/learn/submit" >/dev/null

# Optional header checks
grep -i '^x-learn-attempt-db:'   /tmp/sub.h || true
grep -i '^x-learn-db-scheduled:' /tmp/sub.h || true

post=$(curl -s "$BASE/api/dev/stats")
qA=$(jq -r '.counts.attempts // 0' <<<"$post"); qR=$(jq -r '.counts.reviews // 0' <<<"$post")

echo "attempts: $pA → $qA"
echo "reviews : $pR → $qR"

test "$qA" -ge $((pA+1)) || (echo "FAIL: attempts not incremented" && exit 1)
echo "OK: persistence acceptance passed"


