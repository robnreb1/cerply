#!/usr/bin/env bash
set -euo pipefail

: "${STG:=https://stg.cerply.com}"
: "${JAR:=./.cookies.stg.jar}"

fail() { echo "❌ $*"; exit 1; }
ok()   { echo "✅ $*"; }

echo "PING"
h="$(curl -sI -b "$JAR" "$STG/ping" | tr -d '\r')"
echo "$h" | sed -n '1p'
echo "$h" | grep -qi '^HTTP/.* 204 ' || fail "ping not 204"
echo "$h" | grep -qi '^x-edge: ping' || fail "ping missing x-edge: ping"
ok "ping looks good"

echo
echo "HEALTH"
h="$(curl -sI -b "$JAR" "$STG/api/health" | tr -d '\r')"
echo "$h" | sed -n '1,20p'
echo "$h" | grep -qi '^HTTP/.* 200 ' || fail "health not 200"
echo "$h" | grep -qi '^x-edge: health→proxy' || fail "health not proxied"
ok "health proxy OK"

echo
echo "PROMPTS"
h="$(curl -sI -b "$JAR" "$STG/api/prompts" | tr -d '\r')"
echo "$h" | sed -n '1,20p'
echo "$h" | grep -qi '^HTTP/.* 200 ' || fail "prompts not 200"
echo "$h" | grep -qi '^x-edge: prompts→proxy' || fail "prompts not proxied"
ok "prompts proxy OK"

echo
ok "All staging smoke checks passed."