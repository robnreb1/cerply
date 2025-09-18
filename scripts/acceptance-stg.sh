#!/usr/bin/env bash
set -euo pipefail
STG="${STG:-https://cerply-api-staging-latest.onrender.com}"
COOKIE="/tmp/cerply.cookies"
pass() { echo "✅ $*"; }
fail() { echo "❌ $*"; exit 1; }

# Parse (text)
RES=$(curl -sS -i -X POST "$STG/api/ingest/parse" -H 'content-type: application/json' \
  --data '{"text":"Intro to statistics: mean, variance, confidence intervals."}')
echo "$RES" | grep -q "HTTP/2 200" && echo "$RES" | grep -iq "^x-api:.*parse" || fail "parse failed"
echo "$RES" | sed '1,/^\r$/d' | jq '.sections, .topics' >/dev/null || fail "parse body shape"
pass "parse OK"

# Clarify
RES=$(curl -sS -i -X POST "$STG/api/ingest/clarify" -H 'content-type: application/json' \
  --data '{"question":"What level are you?","context":"planning onboarding"}')
echo "$RES" | grep -q "HTTP/2 200" && echo "$RES" | grep -iq "^x-api:.*ingest-clarify" || fail "clarify failed"
pass "clarify OK"

# Preview
RES=$(curl -sS -i -X POST "$STG/api/ingest/preview" -H 'content-type: application/json' \
  --data '{"text":"Neural networks basics: perceptron, activation functions, backprop."}')
echo "$RES" | grep -q "HTTP/2 200" && echo "$RES" | grep -iq "^x-preview-impl:" || fail "preview failed"
echo "$RES" | sed '1,/^\r$/d' | jq '.modules[0].title,.modules[0].estMinutes' >/dev/null || fail "preview body shape"
pass "preview OK"

# Generate (unauth 401)
RES=$(curl -sS -i -X POST "$STG/api/ingest/generate" -H 'content-type: application/json' \
  --data '{"modules":[{"id":"m1","title":"Demo","estMinutes":5}]}')
echo "$RES" | grep -q "HTTP/2 401" && echo "$RES" | grep -iq "^www-authenticate: Session" || fail "generate unauth not enforced"
pass "generate 401 OK"

# Login dev user
LOGIN_NEXT=$(curl -sS -X POST "$STG/api/auth/login" -H 'content-type: application/json' --data '{"email":"dev@local"}' | jq -r .next)
curl -sS -i -c "$COOKIE" "$STG${LOGIN_NEXT}&redirect=http://localhost:3000/" >/dev/null
curl -sS -b "$COOKIE" "$STG/api/auth/me" | jq -e '.user.id=="dev"' >/dev/null || fail "auth/me failed"

# Generate (stub 200)
RES=$(curl -sS -i "$STG/api/ingest/generate" -X POST -b "$COOKIE" \
  -H 'content-type: application/json' -H 'x-generate-impl: v3-stub' \
  --data '{"modules":[{"id":"m1","title":"Demo","estMinutes":5}]}')
echo "$RES" | grep -q "HTTP/2 200" && echo "$RES" | grep -iq "^x-api:.*ingest-generate" || fail "generate (stub) failed"
echo "$RES" | sed '1,/^\r$/d' | jq -e '.items | length>0' >/dev/null || fail "generate body shape"
pass "generate (stub) OK"

echo "🎉 Acceptance (staging) passed"
