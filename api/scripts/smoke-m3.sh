#!/usr/bin/env bash
# smoke-m3.sh — M3 API Surface smoke tests
# Usage: ./scripts/smoke-m3.sh [API_BASE]

set -euo pipefail

API_BASE="${1:-http://localhost:8080}"

echo "=== M3 API Surface Smoke Tests ==="
echo "API_BASE: $API_BASE"
echo

failed=0

# Helper: assert status code
assert_status() {
  local endpoint="$1"
  local method="$2"
  local expected="$3"
  local payload="${4:-}"
  
  echo -n "Testing $method $endpoint ... "
  
  if [ "$method" = "GET" ]; then
    status=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE$endpoint")
  else
    status=$(curl -s -o /dev/null -w "%{http_code}" \
      -X "$method" \
      -H "Content-Type: application/json" \
      -d "$payload" \
      "$API_BASE$endpoint")
  fi
  
  if [ "$status" = "$expected" ]; then
    echo "✓ $status"
  else
    echo "✗ Expected $expected, got $status"
    ((failed++))
  fi
}

# Helper: assert JSON field presence
assert_json_field() {
  local endpoint="$1"
  local method="$2"
  local payload="$3"
  local field="$4"
  
  echo -n "Testing $method $endpoint has field '$field' ... "
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s "$API_BASE$endpoint")
  else
    response=$(curl -s \
      -X "$method" \
      -H "Content-Type: application/json" \
      -d "$payload" \
      "$API_BASE$endpoint")
  fi
  
  if echo "$response" | jq -e "$field" > /dev/null 2>&1; then
    echo "✓"
  else
    echo "✗ Field not found"
    echo "Response: $response"
    ((failed++))
  fi
}

echo "--- POST /api/preview ---"
assert_status "/api/preview" "POST" "200" '{"content":"Learn quantum mechanics basics"}'
assert_json_field "/api/preview" "POST" '{"content":"test"}' '.summary'
assert_json_field "/api/preview" "POST" '{"content":"test"}' '.proposed_modules'
assert_json_field "/api/preview" "POST" '{"content":"test"}' '.clarifying_questions'
assert_status "/api/preview" "POST" "400" '{}'
echo

echo "--- POST /api/generate ---"
assert_status "/api/generate" "POST" "200" '{"modules":[{"title":"Test Module"}]}'
assert_json_field "/api/generate" "POST" '{"modules":[{"title":"Test"}]}' '.modules'
assert_json_field "/api/generate" "POST" '{"modules":[{"title":"Test"}]}' '.modules[0].id'
assert_json_field "/api/generate" "POST" '{"modules":[{"title":"Test"}]}' '.modules[0].lessons'
assert_json_field "/api/generate" "POST" '{"modules":[{"title":"Test"}]}' '.modules[0].items'
assert_status "/api/generate" "POST" "400" '{}'
echo

echo "--- POST /api/score ---"
assert_status "/api/score" "POST" "200" '{"item_id":"test-1","user_answer":"correct"}'
assert_json_field "/api/score" "POST" '{"item_id":"test-1","user_answer":"test"}' '.score'
assert_json_field "/api/score" "POST" '{"item_id":"test-1","user_answer":"test"}' '.difficulty'
assert_json_field "/api/score" "POST" '{"item_id":"test-1","user_answer":"test"}' '.misconceptions'
assert_json_field "/api/score" "POST" '{"item_id":"test-1","user_answer":"test"}' '.next_review_days'
assert_status "/api/score" "POST" "400" '{}'
echo

echo "--- GET /api/daily/next ---"
assert_status "/api/daily/next" "GET" "200"
assert_json_field "/api/daily/next" "GET" "" '.queue'
assert_json_field "/api/daily/next" "GET" "" '.queue[0].item_id'
assert_json_field "/api/daily/next" "GET" "" '.queue[0].priority'
echo

echo "--- GET /api/ops/usage/daily ---"
assert_status "/api/ops/usage/daily" "GET" "200"
assert_json_field "/api/ops/usage/daily" "GET" "" '.generated_at'
assert_json_field "/api/ops/usage/daily" "GET" "" '.today'
assert_json_field "/api/ops/usage/daily" "GET" "" '.aggregates'
echo

echo "--- GET /api/version ---"
assert_status "/api/version" "GET" "200"
assert_json_field "/api/version" "GET" "" '.ok'
echo

if [ $failed -eq 0 ]; then
  echo "✓ All M3 smoke tests passed"
  exit 0
else
  echo "✗ $failed test(s) failed"
  exit 1
fi
