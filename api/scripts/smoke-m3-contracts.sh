#!/usr/bin/env bash
# Smoke test for M3 API contracts - headers and envelopes
# Usage: ./smoke-m3-contracts.sh [API_BASE]
# Example: ./smoke-m3-contracts.sh https://cerply-api-staging-latest.onrender.com

set -euo pipefail

API="${1:-http://localhost:8080}"
PASS=0
FAIL=0

echo "🔍 M3 Contract Smoke Tests - $API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Helper: check header exists
check_header() {
  local name="$1"
  local response="$2"
  if echo "$response" | grep -i "^$name:" > /dev/null; then
    echo "  ✓ Header $name present"
    ((PASS++))
  else
    echo "  ✗ Header $name missing"
    ((FAIL++))
  fi
}

# Helper: check status code
check_status() {
  local expected="$1"
  local response="$2"
  local status=$(echo "$response" | grep -E "^HTTP" | awk '{print $2}')
  if [ "$status" = "$expected" ]; then
    echo "  ✓ Status $status"
    ((PASS++))
  else
    echo "  ✗ Status $status (expected $expected)"
    ((FAIL++))
  fi
}

# Helper: check JSON field exists
check_json_field() {
  local field="$1"
  local body="$2"
  if echo "$body" | jq -e "$field" > /dev/null 2>&1; then
    echo "  ✓ Field $field present"
    ((PASS++))
  else
    echo "  ✗ Field $field missing"
    ((FAIL++))
  fi
}

echo ""
echo "TEST 1: POST /api/preview (fresh)"
echo "────────────────────────────────────"
RESP=$(curl -si -X POST "$API/api/preview" \
  -H 'content-type: application/json' \
  -d '{"content":"quantum mechanics basics"}' 2>/dev/null || echo "")
BODY=$(echo "$RESP" | sed -n '/^{/,//p')

check_status "200" "$RESP"
check_header "x-canon" "$RESP"
check_header "x-quality" "$RESP"
check_header "x-cost" "$RESP"
check_header "x-adapt" "$RESP"
check_json_field ".data" "$BODY"
check_json_field ".meta" "$BODY"

echo ""
echo "TEST 2: POST /api/generate (fresh)"
echo "────────────────────────────────────"
RESP=$(curl -si -X POST "$API/api/generate" \
  -H 'content-type: application/json' \
  -d '{"modules":[{"title":"Linear Algebra"}],"level":"intermediate"}' 2>/dev/null || echo "")
BODY=$(echo "$RESP" | sed -n '/^{/,//p')

check_status "200" "$RESP"
check_header "x-canon" "$RESP"
check_header "x-quality" "$RESP"
check_header "x-cost" "$RESP"
check_header "x-adapt" "$RESP"
check_json_field ".data.modules" "$BODY"
check_json_field ".meta.source" "$BODY"
check_json_field ".meta.quality_score" "$BODY"

echo ""
echo "TEST 3: POST /api/score (auto-assessment)"
echo "────────────────────────────────────"
RESP=$(curl -si -X POST "$API/api/score" \
  -H 'content-type: application/json' \
  -d '{"item_id":"test-1","response_text":"the matrix determinant measures volume scaling","latency_ms":8500}' 2>/dev/null || echo "")
BODY=$(echo "$RESP" | sed -n '/^{/,//p')

check_status "200" "$RESP"
check_header "x-canon" "$RESP"
check_header "x-quality" "$RESP"
check_header "x-cost" "$RESP"
check_header "x-adapt" "$RESP"
check_json_field ".data.correct" "$BODY"
check_json_field ".data.rationale" "$BODY"
check_json_field ".data.signals" "$BODY"

echo ""
echo "TEST 4: GET /api/daily/next"
echo "────────────────────────────────────"
RESP=$(curl -si "$API/api/daily/next?sid=test-session" 2>/dev/null || echo "")
BODY=$(echo "$RESP" | sed -n '/^{/,//p')

check_status "200" "$RESP"
check_header "x-canon" "$RESP"
check_header "x-quality" "$RESP"
check_header "x-cost" "$RESP"
check_header "x-adapt" "$RESP"
check_json_field ".data.queue" "$BODY"
check_json_field ".meta.adaptation_reason" "$BODY"

echo ""
echo "TEST 5: GET /api/ops/usage/daily"
echo "────────────────────────────────────"
RESP=$(curl -si "$API/api/ops/usage/daily" 2>/dev/null || echo "")
BODY=$(echo "$RESP" | sed -n '/^{/,//p')

check_status "200" "$RESP"
check_header "x-canon" "$RESP"
check_header "x-quality" "$RESP"
check_header "x-cost" "$RESP"
check_header "x-adapt" "$RESP"
check_json_field ".data.routes" "$BODY"
check_json_field ".meta.cost_graph" "$BODY"

echo ""
echo "TEST 6: POST /api/score - 400 validation error"
echo "────────────────────────────────────"
RESP=$(curl -si -X POST "$API/api/score" \
  -H 'content-type: application/json' \
  -d '{"invalid":"payload"}' 2>/dev/null || echo "")
BODY=$(echo "$RESP" | sed -n '/^{/,//p')

check_status "400" "$RESP"
check_json_field ".error.code" "$BODY"
check_json_field ".error.message" "$BODY"

echo ""
echo "TEST 7: POST /api/preview - error envelope"
echo "────────────────────────────────────"
RESP=$(curl -si -X POST "$API/api/preview" \
  -H 'content-type: application/json' \
  -d '{}' 2>/dev/null || echo "")
BODY=$(echo "$RESP" | sed -n '/^{/,//p')

check_status "400" "$RESP"
check_json_field ".error.code" "$BODY"
check_json_field ".error.message" "$BODY"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Results: $PASS passed, $FAIL failed"
echo ""

if [ $FAIL -gt 0 ]; then
  exit 1
fi

exit 0

