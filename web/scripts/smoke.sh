#!/usr/bin/env bash
set -euo pipefail

echo "Testing Curate page Quality tab visibility..."

# Test the curate page
echo "GET /curate"
CURATE_RESPONSE=$(curl -fsS "http://localhost:3000/curate" || echo "Failed to fetch /curate")

# Check if Quality tab is present
if echo "$CURATE_RESPONSE" | grep -q "Quality"; then
    echo "✅ Quality tab found in /curate page"
else
    echo "❌ Quality tab NOT found in /curate page"
    echo "This might be expected if NEXT_PUBLIC_FF_QUALITY_BAR_V1 is not set to 'true'"
fi

# Test the API endpoint directly
echo ""
echo "Testing quality API endpoint..."
API_BASE="${API_BASE:-http://localhost:8080}"

# Test with a simple item
TEST_ITEM='{"items":[{"id":"test","stem":"What is the capital of France?","options":["Paris","London","Berlin","Madrid"],"correctIndex":0}]}'

echo "POST /curator/quality/compute"
QUALITY_RESPONSE=$(curl -fsS -X POST "$API_BASE/curator/quality/compute" \
  -H "Content-Type: application/json" \
  -d "$TEST_ITEM" || echo "Failed to call quality endpoint")

if echo "$QUALITY_RESPONSE" | grep -q "qualityScore"; then
    echo "✅ Quality API endpoint working"
    echo "$QUALITY_RESPONSE" | jq '.' 2>/dev/null || echo "$QUALITY_RESPONSE"
else
    echo "❌ Quality API endpoint failed or returned unexpected response"
    echo "$QUALITY_RESPONSE"
fi

echo ""
echo "Smoke test completed!"

