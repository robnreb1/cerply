#!/usr/bin/env bash
set -euo pipefail

# You can override these when calling the script or via CI env.
STG="${STG:-https://cerply-staging.vercel.app}"
API_STG="${API_STG:-https://api-stg.cerply.com}"

JAR=".cookies.stg.jar"
TS="$(date +%s)"
HDRS1="$(mktemp)"
HDRS2="$(mktemp)"
echo
echo "PING"
curl -sI "$STG/ping" | tee "$HDRS1" | sed -n '1,20p'
STATUS=$(awk 'NR==1{print $2}' "$HDRS1")
EDGE=$(grep -i '^x-edge:' "$HDRS1" | tr -d '\r' | awk '{print $2}')
if [[ "$STATUS" == "204" && "$EDGE" == "ping" ]]; then
  echo "✅ ping looks good"
else
  echo "❌ ping unexpected. status=$STATUS edge=$EDGE"; exit 1
fi

echo
echo "HEALTH"
curl -sI "$STG/api/health" | tee "$HDRS1" | sed -n '1,20p'
STATUS=$(awk 'NR==1{print $2}' "$HDRS1")
EDGE=$(grep -i '^x-edge:' "$HDRS1" | tr -d '\r' | awk '{print $2}')
UPSTREAM=$(grep -i '^x-upstream:' "$HDRS1" | tr -d '\r' | awk '{print $2}')
if [[ "$STATUS" == "200" && "$EDGE" == "health-proxy" ]]; then
  echo "✅ health proxied → ${UPSTREAM:-unknown}"
else
  echo "❌ health not proxied. status=$STATUS edge=$EDGE upstream=$UPSTREAM"; exit 1
fi

echo
echo "PROMPTS"
# We only assert that our edge route is reachable; upstream may 404,
# in which case the edge serves fallback with x-edge: prompts-fallback.
curl -sI "$STG/api/prompts?t=$TS" | tee "$HDRS2" | sed -n '1,20p'
STATUS2=$(awk 'NR==1{print $2}' "$HDRS2")
EDGE2=$(grep -i '^x-edge:' "$HDRS2" | tr -d '\r' | awk '{print $2}')
if [[ "$EDGE2" =~ ^prompts ]]; then
  echo "✅ prompts route reachable ($EDGE2, status=$STATUS2)"
else
  echo "❌ prompts unexpected. status=$STATUS2 edge=$EDGE2"; exit 1
fi
