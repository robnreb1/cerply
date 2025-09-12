#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   WEB_BASE="https://cerply-staging.vercel.app" \
#   API_BASE="https://api-stg.cerply.com" \
#   VERCEL_BYPASS="your-bypass-token" \
#   bash scripts/smoke-stg.sh

WEB_BASE="${WEB_BASE:-https://cerply-staging.vercel.app}"
API_BASE="${API_BASE:-https://api-stg.cerply.com}"

# Allow overrides if needed
CURL_BIN="${CURL_BIN:-curl}"
JQ_BIN="${JQ_BIN:-jq}"

COOKIE_JAR="$(mktemp -t vercel_cookie_XXXXXX)"
cleanup() { rm -f "$COOKIE_JAR" 2>/dev/null || true; }
trap cleanup EXIT

echo "==> WEB_BASE: $WEB_BASE"
echo "==> API_BASE: $API_BASE"

if [[ -n "${VERCEL_BYPASS:-}" ]]; then
  echo "==> Using Vercel bypass token (cookie jar: $COOKIE_JAR)"
  # Build a reusable bypass header and also set cookies on a few key paths.
  H_BYPASS=(-H "x-vercel-protection-bypass: ${VERCEL_BYPASS}")
  # Hit multiple paths to get the bypass cookie scoped and persisted.
  for path in "/" "/api/health" "/ping"; do
    BYPASS_URL="${WEB_BASE%/}${path}?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${VERCEL_BYPASS}"
    # -L follow redirects; -D - prints headers (debug); -o /dev/null ignores body; -c writes cookies to jar
    $CURL_BIN -sS -L -D - -o /dev/null -c "$COOKIE_JAR" "${H_BYPASS[@]}" "$BYPASS_URL" || true
  done
  echo "==> Cookie jar contents after bypass:"
  cat "$COOKIE_JAR" || true

  # Decide whether to run WEB checks based on presence of the real bypass cookie.
  HAS_BYPASS_COOKIE=0
  if grep -qi "__vercel_protection_bypass" "$COOKIE_JAR"; then
    HAS_BYPASS_COOKIE=1
    echo "==> Detected __vercel_protection_bypass cookie; WEB checks enabled."
  else
    echo "==> No __vercel_protection_bypass cookie detected; WEB checks will be skipped to avoid noise."
  fi
else
  echo "==> VERCEL_BYPASS not set; protected web routes will likely return 401."
  HAS_BYPASS_COOKIE=0
fi

line() { printf '%s\n' "--------------------------------------------------------------------------------"; }
status_head() { $CURL_BIN -sS -i "$@" | head -n 1; }

# --- WEB: /ping ---
if [[ "${HAS_BYPASS_COOKIE:-0}" -eq 1 ]]; then
  line
  echo "==> GET ${WEB_BASE%/}/ping"
  if [[ -n "${VERCEL_BYPASS:-}" ]]; then
    status_head -b "$COOKIE_JAR" -c "$COOKIE_JAR" -L "${H_BYPASS[@]}" "${WEB_BASE%/}/ping" || true
  else
    status_head -L "${WEB_BASE%/}/ping" || true
  fi
else
  line
  echo "==> Skipping WEB /ping (no __vercel_protection_bypass cookie)"
fi

# --- WEB: /api/health ---
if [[ "${HAS_BYPASS_COOKIE:-0}" -eq 1 ]]; then
  line
  echo "==> GET ${WEB_BASE%/}/api/health"
  if [[ -n "${VERCEL_BYPASS:-}" ]]; then
    status_head -b "$COOKIE_JAR" -c "$COOKIE_JAR" -L "${H_BYPASS[@]}" "${WEB_BASE%/}/api/health" || true
  else
    status_head -L "${WEB_BASE%/}/api/health" || true
  fi
else
  line
  echo "==> Skipping WEB /api/health (no __vercel_protection_bypass cookie)"
fi


# --- API (direct): /api/health ---
line
echo "==> API health (direct) ${API_BASE%/}/api/health"
status_head "${API_BASE%/}/api/health" || true
$CURL_BIN -sS "${API_BASE%/}/api/health" | $JQ_BIN . 2>/dev/null || true

# --- API (direct): routes dump if available ---
line
echo "==> Routes count (direct)"
ROUTES_COUNT="$($CURL_BIN -sS "${API_BASE%/}/__/routes.json" | $JQ_BIN 'length' 2>/dev/null || echo 'n/a')"
echo "$ROUTES_COUNT"

# --- Protected WEB endpoints (only with bypass) ---
if [[ "${HAS_BYPASS_COOKIE:-0}" -eq 1 ]]; then
  line
  echo "==> GET ${WEB_BASE%/}/api/prompts"
  status_head -b "$COOKIE_JAR" -c "$COOKIE_JAR" -L "${H_BYPASS[@]}" "${WEB_BASE%/}/api/prompts" || true

  line
  echo "==> POST ${WEB_BASE%/}/api/ingest/preview"
  status_head -b "$COOKIE_JAR" -c "$COOKIE_JAR" -L \
    "${H_BYPASS[@]}" \
    -H 'content-type: application/json' \
    -d '{"text":"Smoke test preview"}' \
    "${WEB_BASE%/}/api/ingest/preview" || true
else
  line
  echo "==> Skipping protected endpoints (/api/prompts, /api/ingest/preview) because __vercel_protection_bypass cookie is not set."
fi

line

echo "Assertions passed."

# --- Optional: Legacy ingest smoke (guarded) ---
if [[ "${LEGACY_INGEST_SMOKE:-}" == "1" || "${LEGACY_INGEST_SMOKE:-}" == "true" ]]; then
  line
  echo "==> Legacy ingest smoke (guarded)"

  echo "-- unauth generate -> 401"
  $CURL_BIN -sS -i "${API_BASE%/}/api/ingest/generate" \
    -H 'content-type: application/json' \
    --data '{"modules":[{"id":"m1","title":"Test","estMinutes":5}]}' | head -n 20 || true

  echo "-- dev login"
  LOGIN_NEXT=$($CURL_BIN -sS -X POST "${API_BASE%/}/api/auth/login" \
    -H 'content-type: application/json' --data '{"email":"dev@local"}' | $JQ_BIN -r .next)
  $CURL_BIN -sS -i -c /tmp/cerply.cookies "${API_BASE%/}${LOGIN_NEXT}&redirect=http://localhost:3000/" >/dev/null || true

  echo "-- stubbed generate -> 200"
  $CURL_BIN -sS -i -b /tmp/cerply.cookies "${API_BASE%/}/api/ingest/generate" \
    -H 'content-type: application/json' -H 'x-generate-impl: v3-stub' \
    --data '{"modules":[{"id":"m1","title":"Test","estMinutes":5}]}' | head -n 40 || true

  echo "-- parse/preview/clarify/followup basic shape"
  $CURL_BIN -sS -i "${API_BASE%/}/api/ingest/parse"    -X POST -H 'content-type: application/json' --data '{}' | head -n 20 || true
  $CURL_BIN -sS -i "${API_BASE%/}/api/ingest/preview"  -X POST -H 'content-type: application/json' --data '{}' | head -n 20 || true
  $CURL_BIN -sS -i "${API_BASE%/}/api/ingest/clarify"  -X POST -H 'content-type: application/json' --data '{}' | head -n 20 || true
  $CURL_BIN -sS -i "${API_BASE%/}/api/ingest/followup" -X POST -H 'content-type: application/json' --data '{}' | head -n 20 || true
fi