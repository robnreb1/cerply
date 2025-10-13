#!/bin/bash
####################################################################################
# Epic 9: Adaptive Difficulty Engine - Smoke Tests
# Tests all 4 adaptive API endpoints to verify they respond correctly
####################################################################################

set -e

API_URL="${API_URL:-http://localhost:8080}"
TEST_USER_ID="${TEST_USER_ID:-00000000-0000-0000-0000-000000000001}"
TEST_TOPIC_ID="${TEST_TOPIC_ID:-00000000-0000-0000-0000-000000000002}"
ADMIN_TOKEN="${ADMIN_TOKEN:-dev-admin-token}"

echo "===================================================================================="
echo "Epic 9: Adaptive Difficulty Smoke Tests"
echo "API URL: $API_URL"
echo "Test User ID: $TEST_USER_ID"
echo "Test Topic ID: $TEST_TOPIC_ID"
echo "===================================================================================="
echo ""

# Counter for tests
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

run_test() {
  local test_name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"
  local expected_code="$5"
  
  TESTS_RUN=$((TESTS_RUN + 1))
  echo "Test $TESTS_RUN: $test_name"
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL$endpoint" \
      -H "x-admin-token: $ADMIN_TOKEN" \
      -H "Content-Type: application/json")
  else
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL$endpoint" \
      -H "x-admin-token: $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "$expected_code" ]; then
    echo "✓ PASS - HTTP $http_code (expected $expected_code)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo "✗ FAIL - HTTP $http_code (expected $expected_code)"
    echo "Response: $body"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  echo ""
}

echo "Starting adaptive difficulty smoke tests..."
echo ""

# Test 1: GET /api/adaptive/profile/:userId
run_test \
  "Get learner adaptive profile" \
  "GET" \
  "/api/adaptive/profile/$TEST_USER_ID" \
  "" \
  "200"

# Test 2: GET /api/adaptive/topics/:topicId/difficulty/:userId
run_test \
  "Get recommended difficulty for topic" \
  "GET" \
  "/api/adaptive/topics/$TEST_TOPIC_ID/difficulty/$TEST_USER_ID" \
  "" \
  "200"

# Test 3: POST /api/adaptive/attempt (with valid data)
run_test \
  "Record adaptive attempt" \
  "POST" \
  "/api/adaptive/attempt" \
  "{\"userId\":\"$TEST_USER_ID\",\"topicId\":\"$TEST_TOPIC_ID\",\"questionId\":\"$TEST_TOPIC_ID\",\"correct\":true,\"difficultyLevel\":\"application\"}" \
  "200"

# Test 4: GET /api/adaptive/analytics/:userId
run_test \
  "Get adaptive analytics for user" \
  "GET" \
  "/api/adaptive/analytics/$TEST_USER_ID" \
  "" \
  "200"

# Test 5: POST /api/adaptive/attempt with partial credit
run_test \
  "Record adaptive attempt with partial credit" \
  "POST" \
  "/api/adaptive/attempt" \
  "{\"userId\":\"$TEST_USER_ID\",\"topicId\":\"$TEST_TOPIC_ID\",\"questionId\":\"$TEST_TOPIC_ID\",\"correct\":false,\"partialCredit\":0.75,\"responseTimeMs\":3500,\"difficultyLevel\":\"analysis\"}" \
  "200"

# Test 6: Invalid UUID format (should return 400)
run_test \
  "Get profile with invalid UUID (expect 400)" \
  "GET" \
  "/api/adaptive/profile/invalid-uuid" \
  "" \
  "400"

# Test 7: Invalid difficulty level (should return 400)
run_test \
  "Record attempt with invalid difficulty (expect 400)" \
  "POST" \
  "/api/adaptive/attempt" \
  "{\"userId\":\"$TEST_USER_ID\",\"topicId\":\"$TEST_TOPIC_ID\",\"questionId\":\"$TEST_TOPIC_ID\",\"correct\":true,\"difficultyLevel\":\"invalid\"}" \
  "400"

# Test 8: Missing required fields (should return 400)
run_test \
  "Record attempt with missing fields (expect 400)" \
  "POST" \
  "/api/adaptive/attempt" \
  "{\"userId\":\"$TEST_USER_ID\"}" \
  "400"

echo "===================================================================================="
echo "Smoke Test Results"
echo "===================================================================================="
echo "Tests run: $TESTS_RUN"
echo "Tests passed: $TESTS_PASSED"
echo "Tests failed: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo "✓ ALL TESTS PASSED"
  exit 0
else
  echo "✗ SOME TESTS FAILED"
  exit 1
fi
