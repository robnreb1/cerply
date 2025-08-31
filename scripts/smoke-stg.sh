#!/usr/bin/env bash
set -euo pipefail

STG="${STG:-https://cerply-staging.vercel.app}"
API_STG="${API_STG:-https://api-stg.cerply.com}"

JAR="${JAR:-.cookies.stg.jar}"
TS="$(date +%s)"
HDRS1="$(mktemp)"
HDRS2="$(mktemp)"

# If preview protection is enabled, include bypass on every request.
BYPASS_HDR=()
if [[ -n "${VERCEL_BYPASS:-}" ]]; then
  BYPASS_HDR=( -H "x-vercel-protection-bypass: $VERCEL_BYPASS"
               -H "Cookie: vercel_bypass=$VERCEL_BYPASS" )
fi

head20(){ sed -n '1,20p'; }

echo "PING"
curl -sI -b "$JAR" "${BYPASS_HDR[@]}" "$STG/ping" | tee "$HDRS1" | head20
STATUS1=$(awk 'NR==1{print $2}' "$HDRS1")
EDGE1=$(grep -i '^x-edge:' "$HDRS1" | tr -d '\r' | awk '{print $2}')
if [[ "$STATUS1" == "204" && "$EDGE1" == "ping" ]]; then
  echo "✅ ping looks good"
else
  echo "❌ ping unexpected. status=$STATUS1 edge=$EDGE1"; exit 1
fi

echo; echo "HEALTH"
curl -sI -b "$JAR" "${BYPASS_HDR[@]}" "$STG/api/health?t=$TS" | tee "$HDRS1" | head20
STATUS_H=$(awk 'NR==1{print $2}' "$HDRS1")
EDGE_H=$(grep -i '^x-edge:' "$HDRS1" | tr -d '\r' | awk '{print $2}')
if [[ "$STATUS_H" == "200" && "$EDGE_H" =~ ^health ]]; then
  echo "✅ health proxied"
else
  echo "❌ health unexpected. status=$STATUS_H edge=$EDGE_H"; exit 1
fi

echo; echo "PROMPTS"
curl -sI -b "$JAR" "${BYPASS_HDR[@]}" "$STG/api/prompts?t=$TS" | tee "$HDRS2" | head20
STATUS2=$(awk 'NR==1{print $2}' "$HDRS2")
EDGE2=$(grep -i '^x-edge:' "$HDRS2" | tr -d '\r' | awk '{print $2}')
if [[ "$EDGE2" =~ ^prompts ]]; then
  echo "✅ prompts route reachable ($EDGE2, status=$STATUS2)"
else
  echo "❌ prompts unexpected. status=$STATUS2 edge=$EDGE2"; exit 1
fi
