#!/usr/bin/env bash
# Learner MVP UI Smoke Test
# Tests all critical flows for the new /learn page

set -euo pipefail

BASE="${1:-http://localhost:3000}"
PASS=0
FAIL=0

log() { echo "[$(date +%T)] $*"; }
pass() { log "✅ $1"; ((PASS++)); }
fail() { log "❌ $1"; ((FAIL++)); }

log "=== Learner MVP Smoke Test ==="
log "Target: $BASE"
echo

# Test 1: /learn page loads
log "1️⃣  GET /learn"
if curl -sf "$BASE/learn" | grep -q "what would you like to learn"; then
  pass "/learn page loads with correct heading"
else
  fail "/learn page missing or incorrect"
fi

# Test 2: Topic input is present
log "2️⃣  Topic input present"
if curl -sf "$BASE/learn" | grep -q 'data-testid="topic-input"'; then
  pass "Topic input element found"
else
  fail "Topic input missing"
fi

# Test 3: Preview button present
log "3️⃣  Preview button present"
if curl -sf "$BASE/learn" | grep -q 'data-testid="preview-button"'; then
  pass "Preview button found"
else
  fail "Preview button missing"
fi

# Test 4: Upload button present
log "4️⃣  Upload button present"
if curl -sf "$BASE/learn" | grep -q 'data-testid="upload-button"'; then
  pass "Upload button found"
else
  fail "Upload button missing"
fi

# Test 5: Chat toggle present (requires session, so check via e2e)
# Skipped in smoke test, covered by Playwright

# Test 6: UAT banner on non-localhost
if [[ "$BASE" != *"localhost"* ]]; then
  log "5️⃣  UAT banner check"
  if curl -sf "$BASE/learn" | grep -q "UAT Mode"; then
    pass "UAT banner visible on staging"
  else
    fail "UAT banner missing on staging"
  fi
fi

# Test 7: API base configured correctly
log "6️⃣  API base validation"
HTML=$(curl -sf "$BASE/learn")
if echo "$HTML" | grep -q "apiBase"; then
  pass "API base function present"
else
  fail "API base function missing"
fi

# Test 8: Copy library loaded
log "7️⃣  Copy library validation"
if curl -sf "$BASE/learn" | grep -q "copy.topic"; then
  pass "Copy library integrated"
else
  fail "Copy library not found"
fi

# Test 9: Auth check logic present
log "8️⃣  Auth gate logic"
if curl -sf "$BASE/learn" | grep -q "isAuthed"; then
  pass "Auth gate logic present"
else
  fail "Auth gate missing"
fi

# Test 10: Session persistence logic
log "9️⃣  Session persistence"
if curl -sf "$BASE/learn" | grep -q "learn_session_id"; then
  pass "Session persistence logic found"
else
  fail "Session persistence missing"
fi

echo
log "=== Summary ==="
log "Passed: $PASS"
log "Failed: $FAIL"

if [ $FAIL -gt 0 ]; then
  log "❌ Smoke test FAILED"
  exit 1
else
  log "✅ All smoke tests PASSED"
  exit 0
fi

