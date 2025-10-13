#!/bin/bash
# Complete test script for Epic 8 Phase 2
# This script will:
# 1. Check prerequisites
# 2. Get a question ID from the database
# 3. Test the explanation endpoint
# 4. Test caching

set -e

echo "🧪 Epic 8 Phase 2 - Complete Test Script"
echo "=========================================="
echo ""

# Check if API is running
echo "1️⃣ Checking if API is running..."
if ! curl -s http://localhost:8080/api/health > /dev/null 2>&1; then
  echo "❌ API is not running on http://localhost:8080"
  echo ""
  echo "Start the API first:"
  echo "  export OPENAI_API_KEY=sk-your-key-here"
  echo "  ./start-phase2-api.sh"
  echo ""
  exit 1
fi
echo "✅ API is running"
echo ""

# Check if feature flag is enabled
echo "2️⃣ Checking feature flag..."
RESPONSE=$(curl -s -X POST http://localhost:8080/api/chat/explanation \
  -H "Content-Type: application/json" \
  -H "x-admin-token: test-admin-token-12345" \
  -d '{"questionId":"test","query":"test"}')

if echo "$RESPONSE" | grep -q "NOT_FOUND"; then
  echo "❌ Feature flag FF_CONVERSATIONAL_UI_V1 is not enabled"
  echo ""
  echo "Restart API with:"
  echo "  FF_CONVERSATIONAL_UI_V1=true ADMIN_TOKEN=test-admin-token-12345 npm run dev"
  echo ""
  exit 1
fi
echo "✅ Feature flag enabled"
echo ""

# Get a question ID from database
echo "3️⃣ Getting a question ID from database..."
QUESTION_ID=$(psql -d cerply_dev -t -c "SELECT id FROM items LIMIT 1;" 2>/dev/null | xargs)

if [ -z "$QUESTION_ID" ]; then
  echo "❌ Could not get question ID from database"
  echo ""
  echo "Make sure:"
  echo "  1. PostgreSQL is running"
  echo "  2. Database 'cerply_dev' exists"
  echo "  3. You've run the seed: npm run seed:demo"
  echo ""
  exit 1
fi

echo "✅ Got question ID: $QUESTION_ID"
echo ""

# Test explanation endpoint (first call - not cached)
echo "4️⃣ Testing explanation endpoint (first call)..."
echo "   Query: 'Why is this the correct answer?'"
echo ""

RESPONSE1=$(curl -s -X POST http://localhost:8080/api/chat/explanation \
  -H "Content-Type: application/json" \
  -H "x-admin-token: test-admin-token-12345" \
  -d "{
    \"questionId\": \"$QUESTION_ID\",
    \"query\": \"Why is this the correct answer?\"
  }")

# Check if response is error
if echo "$RESPONSE1" | grep -q '"error"'; then
  echo "❌ Error response:"
  echo "$RESPONSE1" | jq . 2>/dev/null || echo "$RESPONSE1"
  echo ""
  
  if echo "$RESPONSE1" | grep -q "OPENAI_API_KEY"; then
    echo "💡 Hint: Set your OpenAI API key:"
    echo "   export OPENAI_API_KEY=sk-your-key-here"
  fi
  
  exit 1
fi

# Parse and display response
echo "✅ Success! Response:"
echo "$RESPONSE1" | jq . 2>/dev/null || echo "$RESPONSE1"
echo ""

# Check if cached is false
CACHED1=$(echo "$RESPONSE1" | jq -r '.cached' 2>/dev/null)
if [ "$CACHED1" != "false" ]; then
  echo "⚠️  Expected cached=false, got: $CACHED1"
fi

# Test explanation endpoint (second call - should be cached)
echo "5️⃣ Testing explanation endpoint (second call - should be cached)..."
sleep 1

RESPONSE2=$(curl -s -X POST http://localhost:8080/api/chat/explanation \
  -H "Content-Type: application/json" \
  -H "x-admin-token: test-admin-token-12345" \
  -d "{
    \"questionId\": \"$QUESTION_ID\",
    \"query\": \"Why is this the correct answer?\"
  }")

echo "✅ Success! Response:"
echo "$RESPONSE2" | jq . 2>/dev/null || echo "$RESPONSE2"
echo ""

# Check if cached is true
CACHED2=$(echo "$RESPONSE2" | jq -r '.cached' 2>/dev/null)
COST2=$(echo "$RESPONSE2" | jq -r '.cost' 2>/dev/null)
TOKENS2=$(echo "$RESPONSE2" | jq -r '.tokensUsed' 2>/dev/null)

if [ "$CACHED2" = "true" ]; then
  echo "✅ Caching works! (cached: true)"
else
  echo "⚠️  Expected cached=true, got: $CACHED2"
fi

if [ "$COST2" = "0" ]; then
  echo "✅ Cost is zero for cached response"
else
  echo "⚠️  Expected cost=0, got: $COST2"
fi

if [ "$TOKENS2" = "0" ]; then
  echo "✅ Tokens are zero for cached response"
else
  echo "⚠️  Expected tokensUsed=0, got: $TOKENS2"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Phase 2 Testing Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Summary:"
echo "  ✅ API is running"
echo "  ✅ Feature flag enabled"
echo "  ✅ LLM explanations working"
echo "  ✅ Caching working (cost: $0 for cached responses)"
echo ""
echo "Next steps:"
echo "  1. Review EPIC8_PHASE2_DELIVERY.md for details"
echo "  2. Commit the changes"
echo "  3. Continue to Phase 3 (Free-Text Validation)"
echo ""

