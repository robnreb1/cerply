#!/usr/bin/env bash
set -euo pipefail

PROD="${PROD:-https://api.cerply.com}"
COOKIE="/tmp/cerply.prod.cookies"
pass() { echo "✅ $*"; }
fail() { echo "❌ $*"; exit 1; }

echo "Running prod acceptance against: $PROD"

# --- Routes manifest must include /api/db/health ---
if curl -fsS "$PROD/__routes.json" >/dev/null; then
  curl -fsS "$PROD/__routes.json" | jq -e '.routes | map(.url) | any(. == "/api/db/health")' >/dev/null \
    && pass "__routes.json lists /api/db/health" \
    || fail "__routes.json missing /api/db/health"
else
  echo "ℹ️  __routes.json not exposed (that's OK); continuing…"
fi

# --- DB health: must NOT be 404; accept 200 or 5xx with envelope ---
RES="$(curl -sS -i "$PROD/api/db/health" || true)"
STATUS="$(printf '%s\n' "$RES" | head -1 | awk '{print $2}')"
BODY="$(printf '%s\n' "$RES" | sed '1,/^\r$/d')"

if [[ "$STATUS" == "200" ]]; then
  echo "$BODY" | jq -e '.ok==true' >/dev/null || fail "db/health: 200 but body not {ok:true}"
  pass "db/health 200 OK"
elif [[ "$STATUS" =~ ^5[0-9]{2}$ ]]; then
  echo "$BODY" | jq -e '.error.code and .error.message' >/dev/null || fail "db/health: 5xx without error envelope"
  pass "db/health 5xx but route exists and envelope OK"
else
  fail "db/health unexpected status: $STATUS"
fi

# Chat acceptance (prod-safe: clarifier/plan only)
BASE="${PROD:-https://api.cerply.com}" bash ./scripts/acceptance-chat.sh

# --- Parse (text) ---
RES=$(curl -sS -i -X POST "$PROD/api/ingest/parse" -H 'content-type: application/json' \
  --data '{"text":"Intro to statistics: mean, variance, confidence intervals."}')
echo "$RES" | grep -q "HTTP/2 200" && echo "$RES" | grep -iq "^x-api:.*parse" || fail "parse failed"
echo "$RES" | sed '1,/^\r$/d' | jq '.sections, .topics' >/dev/null || fail "parse body shape"
pass "parse OK"

# --- Clarify (allow 200 or 503 with MODEL_UNAVAILABLE) ---
RES=$(curl -sS -i -X POST "$PROD/api/ingest/clarify" -H 'content-type: application/json' \
  --data '{"question":"What level are you?","context":"planning onboarding"}' || true)
STATUS="$(printf '%s\n' "$RES" | head -1 | awk '{print $2}')"
BODY="$(printf '%s\n' "$RES" | sed '1,/^\r$/d')"
if [[ "$STATUS" == "200" ]]; then
  pass "clarify 200 OK"
elif [[ "$STATUS" =~ ^503$ ]] && echo "$BODY" | jq -e '.error.code=="MODEL_UNAVAILABLE"' >/dev/null; then
  pass "clarify 503 MODEL_UNAVAILABLE (acceptable without OPENAI key)"
else
  fail "clarify unexpected: $STATUS"
fi

# --- Preview (allow 200 or 503 with MODEL_UNAVAILABLE) ---
RES=$(curl -sS -i -X POST "$PROD/api/ingest/preview" -H 'content-type: application/json' \
  --data '{"text":"Neural networks basics: perceptron, activation functions, backprop."}' || true)
STATUS="$(printf '%s\n' "$RES" | head -1 | awk '{print $2}')"
BODY="$(printf '%s\n' "$RES" | sed '1,/^\r$/d')"
if [[ "$STATUS" == "200" ]]; then
  echo "$RES" | grep -iq "^x-preview-impl:" || fail "preview missing x-preview-impl header"
  echo "$BODY" | jq '.modules[0].title,.modules[0].estMinutes' >/dev/null || fail "preview body shape"
  pass "preview 200 OK"
elif [[ "$STATUS" =~ ^503$ ]] && echo "$BODY" | jq -e '.error.code=="MODEL_UNAVAILABLE"' >/dev/null; then
  pass "preview 503 MODEL_UNAVAILABLE (acceptable without OPENAI key)"
else
  fail "preview unexpected: $STATUS"
fi

# --- Generate (unauth 401) ---
RES=$(curl -sS -i -X POST "$PROD/api/ingest/generate" -H 'content-type: application/json' \
  --data '{"modules":[{"id":"m1","title":"Demo","estMinutes":5}]}')
echo "$RES" | grep -q "HTTP/2 401" && echo "$RES" | grep -iq "^www-authenticate: Session" || fail "generate unauth not enforced"
pass "generate 401 OK"

# --- Login dev user (cookie session) ---
LOGIN_NEXT=$(curl -sS -X POST "$PROD/api/auth/login" -H 'content-type: application/json' --data '{"email":"dev@local"}' | jq -r .next)
curl -sS -i -c "$COOKIE" "$PROD${LOGIN_NEXT}&redirect=http://localhost:3000/" >/dev/null
curl -sS -b "$COOKIE" "$PROD/api/auth/me" | jq -e '.user.id=="dev"' >/dev/null || fail "auth/me failed"
pass "session login OK"

# --- Generate (stub 200) ---
RES=$(curl -sS -i "$PROD/api/ingest/generate" -X POST -b "$COOKIE" \
  -H 'content-type: application/json' -H 'x-generate-impl: v3-stub' \
  --data '{"modules":[{"id":"m1","title":"Demo","estMinutes":5}]}')
echo "$RES" | grep -q "HTTP/2 200" && echo "$RES" | grep -iq "^x-api:.*ingest-generate" || fail "generate (stub) failed"
echo "$RES" | sed '1,/^\r$/d' | jq -e '.items | length>0' >/dev/null || fail "generate body shape"
pass "generate (stub) OK"

echo "🎉 Acceptance (production) passed"
