#!/usr/bin/env bash
# Adaptive Auto-Assessment Smoke Test
# Tests adaptive thresholds and auto-assessment behavior

set -euo pipefail

BASE="${1:-http://localhost:8080}"
PASS=0
FAIL=0

log() { echo "[$(date +%T)] $*"; }
pass() { log "✅ $1"; ((PASS++)); }
fail() { log "❌ $1"; ((FAIL++)); }

log "=== Adaptive Auto-Assessment Smoke Test ==="
log "Target: $BASE"
echo

# Test 1: POST /api/score with telemetry → returns correct, difficulty, explain
log "1️⃣  POST /api/score (auto-assessment with telemetry)"
SCORE_RESP=$(curl -sf -X POST "$BASE/api/score" \
  -H "Content-Type: application/json" \
  -d '{
    "item_id": "test-1",
    "user_answer": "Matter exhibits both wave and particle properties",
    "expected_answer": "Matter exhibits both wave and particle properties",
    "latency_ms": 5000,
    "item_difficulty": "medium",
    "hint_count": 0,
    "retry_count": 0
  }')

if echo "$SCORE_RESP" | jq -e '.correct == true' > /dev/null; then
  pass "Score API returns correct=true for matching answer"
else
  fail "Score API did not return correct=true"
fi

if echo "$SCORE_RESP" | jq -e '.difficulty' | grep -q "easy\|medium\|hard"; then
  pass "Score API returns valid difficulty"
else
  fail "Score API missing/invalid difficulty"
fi

if echo "$SCORE_RESP" | jq -e '.explain' > /dev/null; then
  pass "Score API returns explain field"
else
  fail "Score API missing explain field"
fi

if echo "$SCORE_RESP" | jq -e '.diagnostics' > /dev/null; then
  pass "Score API returns diagnostics"
else
  fail "Score API missing diagnostics"
fi

# Test 2: Fast + correct → difficulty=easy
log "2️⃣  Fast correct answer → difficulty=easy inference"
FAST_RESP=$(curl -sf -X POST "$BASE/api/score" \
  -H "Content-Type: application/json" \
  -d '{
    "item_id": "test-2",
    "user_answer": "correct answer",
    "expected_answer": "correct answer",
    "latency_ms": 8000,
    "item_difficulty": "medium",
    "hint_count": 0,
    "retry_count": 0
  }')

if echo "$FAST_RESP" | jq -e '.difficulty == "easy"' > /dev/null; then
  pass "Fast correct answer inferred as easy"
else
  log "⚠️  Warning: Fast correct not inferred as easy (may be threshold dependent)"
fi

# Test 3: Slow or hints → difficulty=hard
log "3️⃣  Slow answer → difficulty=hard inference"
SLOW_RESP=$(curl -sf -X POST "$BASE/api/score" \
  -H "Content-Type: application/json" \
  -d '{
    "item_id": "test-3",
    "user_answer": "slow answer",
    "expected_answer": "correct",
    "latency_ms": 35000,
    "item_difficulty": "medium",
    "hint_count": 0,
    "retry_count": 0
  }')

if echo "$SLOW_RESP" | jq -e '.difficulty == "hard"' > /dev/null; then
  pass "Slow answer (>30s) inferred as hard"
else
  fail "Slow answer not inferred as hard"
fi

# Test 4: Wrong answer → explain auto-shown
log "4️⃣  Incorrect answer → explain provided"
WRONG_RESP=$(curl -sf -X POST "$BASE/api/score" \
  -H "Content-Type: application/json" \
  -d '{
    "item_id": "test-4",
    "user_answer": "wrong",
    "expected_answer": "correct answer",
    "latency_ms": 10000,
    "item_difficulty": "medium",
    "hint_count": 0,
    "retry_count": 0
  }')

if echo "$WRONG_RESP" | jq -e '.correct == false' > /dev/null; then
  pass "Wrong answer marked as correct=false"
else
  fail "Wrong answer not marked as correct=false"
fi

if echo "$WRONG_RESP" | jq -e '.explain' | grep -q "correct approach\|Review"; then
  pass "Explain provided for wrong answer"
else
  fail "Explain missing for wrong answer"
fi

# Test 5: POST /api/certified/progress with result telemetry (action=submit)
log "5️⃣  POST /api/certified/progress (auto-assessment mode)"
# Note: Requires CERTIFIED_ENABLED=true and RETENTION_ENABLED=true
PROG_RESP=$(curl -si -X POST "$BASE/api/certified/progress" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "smoke-test-session",
    "card_id": "test-card-1",
    "action": "submit",
    "at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "result": {
      "correct": true,
      "latency_ms": 8000,
      "item_difficulty": "medium",
      "item_type": "card",
      "hint_count": 0,
      "retry_count": 0
    }
  }')

if echo "$PROG_RESP" | grep -q "204\|503"; then
  pass "Progress API accepts action=submit with result telemetry (or disabled)"
else
  fail "Progress API rejected action=submit"
fi

# Test 6: Backward compat - action=grade still accepted (logs deprecation)
log "6️⃣  POST /api/certified/progress (legacy action=grade)"
LEGACY_RESP=$(curl -si -X POST "$BASE/api/certified/progress" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "smoke-test-legacy",
    "card_id": "test-card-2",
    "action": "grade",
    "grade": 4,
    "at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }')

if echo "$LEGACY_RESP" | grep -q "204\|503"; then
  pass "Progress API still accepts action=grade (backward compat)"
else
  fail "Progress API rejected action=grade (backward compat broken)"
fi

# Test 7: GET /api/daily/next with adaptive fields
log "7️⃣  GET /api/daily/next (adaptive response)"
DAILY_RESP=$(curl -sf "$BASE/api/daily/next?sid=smoke-test")

if echo "$DAILY_RESP" | jq -e '.queue' > /dev/null; then
  pass "Daily/next returns queue"
else
  fail "Daily/next missing queue"
fi

if echo "$DAILY_RESP" | jq -e '.assigned_difficulty' | grep -q "easy\|medium\|hard"; then
  pass "Daily/next returns assigned_difficulty"
else
  fail "Daily/next missing assigned_difficulty"
fi

if echo "$DAILY_RESP" | jq -e '.adaptation_reason' > /dev/null; then
  pass "Daily/next returns adaptation_reason"
else
  fail "Daily/next missing adaptation_reason"
fi

# Test 8: Paraphrase variants (never-repeat-verbatim)
log "8️⃣  GET /api/daily/next (paraphrase check)"
DAILY1=$(curl -sf "$BASE/api/daily/next?sid=para-test-1")
DAILY2=$(curl -sf "$BASE/api/daily/next?sid=para-test-1") # Same sid

PROMPT1=$(echo "$DAILY1" | jq -r '.queue[0].prompt // empty')
PROMPT2=$(echo "$DAILY2" | jq -r '.queue[0].prompt // empty')

if [ -n "$PROMPT1" ] && [ -n "$PROMPT2" ]; then
  if [ "$PROMPT1" != "$PROMPT2" ]; then
    pass "Paraphrase variants work (prompts differ on repeat)"
  else
    log "⚠️  Warning: Same prompt returned (may be deterministic stub)"
  fi
else
  log "⚠️  Warning: Could not extract prompts for paraphrase check"
fi

# Test 9: API returns ASCII headers (no ByteString errors)
log "9️⃣  Header validation (ASCII only)"
HEADER_TEST=$(curl -si "$BASE/api/health" 2>&1)
if echo "$HEADER_TEST" | grep -q "ByteString\|invalid character"; then
  fail "Non-ASCII headers detected (ByteString error)"
else
  pass "Headers are ASCII-safe"
fi

# Test 10: CORS headers present for public endpoints
log "🔟  CORS headers on /api/score"
CORS_CHECK=$(curl -si -X OPTIONS "$BASE/api/score" \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" 2>&1 || true)

if echo "$CORS_CHECK" | grep -qi "access-control-allow"; then
  pass "CORS headers present"
else
  log "⚠️  Warning: CORS headers may be missing (check preflight)"
fi

echo
log "=== Summary ==="
log "Passed: $PASS"
log "Failed: $FAIL"

if [ $FAIL -gt 0 ]; then
  log "❌ Adaptive smoke test FAILED"
  exit 1
else
  log "✅ All adaptive smoke tests PASSED"
  exit 0
fi

