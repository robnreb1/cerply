#!/usr/bin/env bash
set -euo pipefail

# You can override these when calling the script or via CI env.
STG="${STG:-https://cerply-staging.vercel.app}"
API_STG="${API_STG:-https://api-stg.cerply.com}"

JAR=".cookies.stg.jar"
: > "$JAR" || true

TS="$(date +%s)"
HDRS1="$(mktemp)"
HDRS2="$(mktemp)"

# If preview protection is enabled, pass a Vercel bypass token via:
#   export VERCEL_BYPASS=XXXX
BYPASS_HDR=()
if [[ -n "${VERCEL_BYPASS:-}" ]]; then
  BYPASS_HDR+=( -H "x-vercel-protection-bypass: $VERCEL_BYPASS" )
fi

head20() { sed -n '1,20p'; }

echo
echo "PING"
curl -sI -b "$JAR" "${BYPASS_HDR[@]}" "$STG/ping?t=$TS" | tee "$HDRS1" | head20
STATUS1=$(awk 'NR==1{print $2}' "$HDRS1")
EDGE1=$(grep -i '^x-edge:' "$HDRS1" | tr -d '\r' | awk '{print $2}')
if [[ "$STATUS1" =~ ^20[0-9]$ ]]; then
  echo "✅ ping looks good"
else
  echo "❌ ping failed (status=$STATUS1 edge=$EDGE1)"; exit 1
fi

echo
echo "HEALTH"
curl -sI -b "$JAR" "${BYPASS_HDR[@]}" "$STG/api/health?t=$TS" | tee "$HDRS1" | head20
STATUSH=$(awk 'NR==1{print $2}' "$HDRS1")
EDGEH=$(grep -i '^x-edge:' "$HDRS1" | tr -d '\r' | awk '{print $2}')
UP=$(grep -i '^x-upstream:' "$HDRS1" | tr -d '\r' | awk '{print $2}')
if [[ "$STATUSH" == "200" && "$EDGEH" =~ ^health ]]; then
  echo "✅ health proxied → $UP"
else
  echo "❌ health not proxied properly. status=$STATUSH edge=$EDGEH upstream=$UP"; exit 1
fi

echo
echo "PROMPTS"
# Upstream may 404; our edge should still return fallback with x-edge: prompts-*
curl -sI -b "$JAR" "${BYPASS_HDR[@]}" "$STG/api/prompts?t=$TS" | tee "$HDRS2" | head20
STATUS2=$(awk 'NR==1{print $2}' "$HDRS2")
EDGE2=$(grep -i '^x-edge:' "$HDRS2" | tr -d '\r' | awk '{print $2}')
if [[ "$EDGE2" =~ ^prompts ]]; then
  echo "✅ prompts route reachable ($EDGE2, status=$STATUS2)"
else
  echo "❌ prompts unexpected. status=$STATUS2 edge=$EDGE2"; exit 1
fi
