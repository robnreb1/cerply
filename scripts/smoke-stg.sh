#!/usr/bin/env bash
set -euo pipefail
# ---- Config ---------------------------------------------------------------
STG="${STG:-${STG_URL:-https://cerply-staging.vercel.app}}"
API_STG="${API_STG:-https://api-stg.cerply.com}"
TS="$(date +%s)"
JAR=".cookies.stg.jar"

# Optional Vercel preview protection bypass header
BYPASS_HEADER=()
if [[ -n "${VERCEL_BYPASS:-}" ]]; then
  BYPASS_HEADER=(-H "x-vercel-protection-bypass: ${VERCEL_BYPASS}")
fi

head20() { sed -n '1,20p'; }
print_section() { echo; echo "$(printf '%s' "$1" | tr '[:lower:]' '[:upper:]')"; }

# ---- PING -----------------------------------------------------------------
print_section "Ping"
curl -sSI -b "$JAR" "${BYPASS_HEADER[@]}" "$STG/ping" | tee /tmp/smoke_ping.h | head20 || true
STATUS1=$(awk 'NR==1{print $2}' /tmp/smoke_ping.h 2>/dev/null || echo "")
EDGE1=$(grep -i '^x-edge:' /tmp/smoke_ping.h 2>/dev/null | tr -d '\r' | awk '{print $2}')
if [[ "$STATUS1" == "204" || "$STATUS1" == "200" ]]; then
  echo "✅ ping ok ($EDGE1)"
elif [[ "$STATUS1" == "401" ]]; then
  echo "⚠️  preview protection (401). Set VERCEL_BYPASS to fully exercise the app. Soft-pass."
else
  echo "❌ ping unexpected: status=$STATUS1 edge=$EDGE1"; exit 1
fi

# ---- HEALTH (proxied) -----------------------------------------------------
print_section "Health"
curl -sSI -b "$JAR" "${BYPASS_HEADER[@]}" "$STG/api/health?t=$TS" | tee /tmp/smoke_health.h | head20 || true
STATUS2=$(awk 'NR==1{print $2}' /tmp/smoke_health.h 2>/dev/null || echo "")
EDGE2=$(grep -i '^x-edge:' /tmp/smoke_health.h 2>/dev/null | tr -d '\r' | awk '{print $2}')
UPSTREAM2=$(grep -i '^x-upstream:' /tmp/smoke_health.h 2>/dev/null | tr -d '\r' | awk '{print $2}')
if [[ "$STATUS2" == "200" && "$EDGE2" == "health-proxy" ]]; then
  echo "✅ health proxied → $UPSTREAM2"
elif [[ "$STATUS2" == "401" ]]; then
  echo "⚠️  preview protection on /api/health – soft-pass"
else
  echo "❌ health unexpected. status=$STATUS2 edge=$EDGE2 upstream=$UPSTREAM2"; exit 1
fi

# ---- PROMPTS (edge fallback allowed) --------------------------------------
print_section "Prompts"
curl -sSI -b "$JAR" "${BYPASS_HEADER[@]}" "$STG/api/prompts?t=$TS" | tee /tmp/smoke_prompts.h | head20 || true
STATUS3=$(awk 'NR==1{print $2}' /tmp/smoke_prompts.h 2>/dev/null || echo "")
EDGE3=$(grep -i '^x-edge:' /tmp/smoke_prompts.h 2>/dev/null | tr -d '\r' | awk '{print $2}')
if [[ "$EDGE3" =~ ^prompts && "$STATUS3" =~ ^(200|404)$ ]]; then
  echo "✅ prompts route reachable ($EDGE3, status=$STATUS3)"
elif [[ "$STATUS3" == "401" ]]; then
  echo "⚠️  preview protection on /api/prompts – soft-pass"
else
  echo "❌ prompts unexpected. status=$STATUS3 edge=$EDGE3"; exit 1
fi

exit 0
