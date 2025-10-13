#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8080}"
ADMIN_TOKEN="${ADMIN_TOKEN:-dev-admin-token-12345}"
ORG_ID="${ORG_ID:-test-org-id}"

echo "🔍 Smoke Testing Epic 8: Conversational UI"
echo "API: $API_BASE"
echo ""

# Test 1: Send chat message
echo "Test 1: POST /api/chat/message"
RESPONSE=$(curl -s -X POST "$API_BASE/api/chat/message" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "x-org-id: $ORG_ID" \
  -H "content-type: application/json" \
  -d '{"message":"How am I doing?"}')

echo "$RESPONSE" | jq '.'

# Check if response contains expected fields
if echo "$RESPONSE" | jq -e '.sessionId' > /dev/null; then
  echo "✅ Test 1 passed: Chat message sent and session created"
else
  echo "❌ Test 1 failed: Missing sessionId in response"
  exit 1
fi
echo ""

# Test 2: List sessions
echo "Test 2: GET /api/chat/sessions"
RESPONSE=$(curl -s "$API_BASE/api/chat/sessions?limit=10" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "x-org-id: $ORG_ID")

echo "$RESPONSE" | jq '.'

if echo "$RESPONSE" | jq -e '.sessions' > /dev/null; then
  echo "✅ Test 2 passed: Sessions listed"
else
  echo "❌ Test 2 failed: Missing sessions in response"
  exit 1
fi
echo ""

echo "✅ All smoke tests passed"

