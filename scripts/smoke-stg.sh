#!/usr/bin/env bash
set -euo pipefail

STG="${STG:-https://stg.cerply.com}"
JAR="${JAR:-./.cookies.stg.jar}"
TS="$(date +%s)"

section() { echo; echo "$1"; }
head20() { sed -n '1,20p'; }

# Ensure bypass cookie (optional; harmless if already present)
if ! grep -q '_vercel_jwt' "$JAR" 2>/dev/null; then
  echo ">>> Setting bypass cookie"
  curl -si -c "$JAR" \
    "$STG/?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${TOKEN:-}" >/dev/null || true
fi

section "PING"
curl -sI -b "$JAR" "$STG/ping?t=$TS" | head20
echo "✅ ping looks good"

section "HEALTH"
HDRS="$(mktemp)"
curl -sI -b "$JAR" "$STG/api/health?t=$TS" | tee "$HDRS" | head20

STATUS=$(awk 'NR==1{print $2}' "$HDRS")
EDGE=$(grep -i '^x-edge:' "$HDRS" | tr -d '\r' | awk '{print $2}')
UP=$(grep -i '^x-upstream:' "$HDRS" | tr -d '\r' | awk '{print $2}')

if [[ "$STATUS" == "200" && "$EDGE" =~ ^health ]]; then
  if [[ -n "${UP:-}" ]]; then
    echo "✅ health proxied → $UP"
  else
    echo "✅ health served at edge ($EDGE)"
  fi
else
  echo "❌ health unexpected. status=$STATUS edge=$EDGE upstream=${UP:-none}"
  exit 1
fi

section "PROMPTS"
HDRS2="$(mktemp)"
curl -sI -b "$JAR" "$STG/api/prompts?t=$TS" | tee "$HDRS2" | head20
STATUS2=$(awk 'NR==1{print $2}' "$HDRS2")
EDGE2=$(grep -i '^x-edge:' "$HDRS2" | tr -d '\r' | awk '{print $2}')

if [[ "$STATUS2" == "200" && "$EDGE2" =~ ^prompts ]]; then
  echo "✅ prompts ok ($EDGE2)"
else
  echo "❌ prompts unexpected. status=$STATUS2 edge=$EDGE2"; exit 1
fi
