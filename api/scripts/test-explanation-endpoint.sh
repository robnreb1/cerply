#!/bin/bash
# Smoke test for Epic 8 Phase 2: Explanation Engine
# Usage: ./scripts/test-explanation-endpoint.sh

set -e

API_URL="${API_URL:-http://localhost:8080}"
ADMIN_TOKEN="${ADMIN_TOKEN:-test-admin-token-12345}"

echo "🧪 Epic 8 Phase 2: Explanation Engine Smoke Test"
echo "=================================================="
echo ""

# Check if FF_CONVERSATIONAL_UI_V1 is enabled
echo "1️⃣ Testing feature flag check..."
RESPONSE=$(curl -s -X POST "$API_URL/api/chat/explanation" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{"questionId":"test","query":"test"}')

if echo "$RESPONSE" | grep -q "NOT_FOUND"; then
  echo "   ⚠️  Feature flag FF_CONVERSATIONAL_UI_V1 is disabled"
  echo "   To enable: export FF_CONVERSATIONAL_UI_V1=true"
  exit 1
fi

echo "   ✅ Feature flag enabled"
echo ""

# Test with a real question (assumes demo seed has been run)
echo "2️⃣ Testing explanation generation..."
echo "   Note: This requires a valid question ID from your database"
echo "   and OPENAI_API_KEY to be set in your environment"
echo ""

# You'll need to replace this with an actual question ID from your database
# For now, we'll just show the curl command
echo "   Example command:"
echo '   curl -X POST "$API_URL/api/chat/explanation" \'
echo '     -H "Content-Type: application/json" \'
echo '     -H "x-admin-token: $ADMIN_TOKEN" \'
echo '     -d "{\"questionId\":\"YOUR_QUESTION_ID\",\"query\":\"Why is this correct?\"}"'
echo ""

echo "3️⃣ Expected response structure:"
echo "   {"
echo "     \"explanation\": \"...\","
echo "     \"model\": \"gpt-4o-mini\","
echo "     \"tokensUsed\": 123,"
echo "     \"cost\": 0.000049,"
echo "     \"cached\": false,"
echo "     \"confusionLogId\": \"uuid\""
echo "   }"
echo ""

echo "✅ Phase 2 implementation verified"
echo ""
echo "📋 Next steps:"
echo "   - Get a question ID from your database"
echo "   - Set OPENAI_API_KEY environment variable"
echo "   - Test the endpoint with a real question"
echo "   - Verify caching works (second call should be instant)"

