#!/usr/bin/env bash
#
# Smoke Test: Batch Content Generation Endpoints (Epic 6.6)
# Tests batch upload, progress, and control endpoints without actual generation
#
# Usage: ./smoke-batch-endpoints.sh [BASE_URL]
#
# Example:
#   ./smoke-batch-endpoints.sh http://localhost:8080
#   ./smoke-batch-endpoints.sh https://api-stg.cerply.com
#

set -e

BASE_URL="${1:-http://localhost:8080}"
echo "🚀 Smoke testing batch endpoints at $BASE_URL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

# Helper function to test endpoint
test_endpoint() {
  local name="$1"
  local method="$2"
  local path="$3"
  local data="$4"
  local expected_code="$5"
  
  echo -n "Testing: $name... "
  
  if [ -z "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$path" \
      -H "Content-Type: application/json" \
      -H "X-Admin-Token: dev-token" 2>/dev/null || echo "000")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$path" \
      -H "Content-Type: application/json" \
      -H "X-Admin-Token: dev-token" \
      -d "$data" 2>/dev/null || echo "000")
  fi
  
  # Extract HTTP code (last line)
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n -1)
  
  if [ "$http_code" = "$expected_code" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
    PASSED=$((PASSED + 1))
    if [ ! -z "$body" ] && [ "$body" != "000" ]; then
      echo "   Response: $(echo "$body" | jq -c '.' 2>/dev/null || echo "$body")"
    fi
  else
    echo -e "${RED}✗ FAIL${NC} (Expected $expected_code, got $http_code)"
    FAILED=$((FAILED + 1))
    if [ ! -z "$body" ]; then
      echo "   Response: $body"
    fi
  fi
  echo ""
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Phase 1: Feature Flag Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Upload endpoint returns 404 when feature flag disabled
test_endpoint \
  "Upload without feature flag" \
  "POST" \
  "/api/content/batch/upload" \
  '{"csvData":"title,category,difficulty\nTest,Test,beginner","phase":"uat"}' \
  "404"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Phase 2: CSV Validation (Mock Tests)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Note: The following tests assume FF_BATCH_GENERATION_V1=true"
echo "      If feature flag is disabled, all tests will return 404"
echo ""

# Test 2: Upload endpoint with invalid CSV (missing phase)
test_endpoint \
  "Upload with missing phase" \
  "POST" \
  "/api/content/batch/upload" \
  '{"csvData":"title,category,difficulty\nTest,Test,beginner"}' \
  "400"

# Test 3: Upload endpoint with invalid phase
test_endpoint \
  "Upload with invalid phase" \
  "POST" \
  "/api/content/batch/upload" \
  '{"csvData":"title,category,difficulty\nTest,Test,beginner","phase":"invalid"}' \
  "400"

# Test 4: Upload endpoint with empty CSV
test_endpoint \
  "Upload with empty CSV" \
  "POST" \
  "/api/content/batch/upload" \
  '{"csvData":"","phase":"uat"}' \
  "400"

# Test 5: Progress endpoint with non-existent batch
test_endpoint \
  "Progress for non-existent batch" \
  "GET" \
  "/api/content/batch/non-existent-batch/progress" \
  "" \
  "404"

# Test 6: Approve endpoint with non-existent batch
test_endpoint \
  "Approve non-existent batch" \
  "POST" \
  "/api/content/batch/non-existent-batch/approve" \
  "" \
  "404"

# Test 7: Reject endpoint with non-existent batch
test_endpoint \
  "Reject non-existent batch (missing reason)" \
  "POST" \
  "/api/content/batch/non-existent-batch/reject" \
  '{}' \
  "400"

# Test 8: Pause endpoint with non-existent batch
test_endpoint \
  "Pause non-existent batch" \
  "POST" \
  "/api/content/batch/non-existent-batch/pause" \
  '{"reason":"test"}' \
  "404"

# Test 9: Resume endpoint with non-existent batch
test_endpoint \
  "Resume non-existent batch" \
  "POST" \
  "/api/content/batch/non-existent-batch/resume" \
  "" \
  "500"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All smoke tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi

