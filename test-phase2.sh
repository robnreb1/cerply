#!/bin/bash
# Quick test script for Epic 8 Phase 2
# Usage: ./test-phase2.sh

echo "🧪 Epic 8 Phase 2 Test Script"
echo "=============================="
echo ""

# Check if OPENAI_API_KEY is set
if [ -z "$OPENAI_API_KEY" ]; then
  echo "⚠️  OPENAI_API_KEY not set in environment"
  echo ""
  echo "To run with OpenAI:"
  echo "  export OPENAI_API_KEY=sk-your-key-here"
  echo "  ./test-phase2.sh"
  echo ""
  echo "For now, I'll start the API without OpenAI (feature disabled)"
  echo ""
fi

# Start API in background with feature flag
echo "1️⃣ Starting API with feature flags..."
cd api
FF_CONVERSATIONAL_UI_V1=true \
OPENAI_API_KEY="${OPENAI_API_KEY:-dummy}" \
npm run dev &
API_PID=$!
cd ..

# Wait for API to start
echo "   Waiting for API to start..."
sleep 5

# Test the endpoint
echo ""
echo "2️⃣ Testing /api/chat/explanation endpoint..."
RESPONSE=$(curl -s -X POST http://localhost:8080/api/chat/explanation \
  -H "Content-Type: application/json" \
  -H "x-admin-token: test-admin-token-12345" \
  -d '{
    "questionId": "test-question-123",
    "query": "Why is this the correct answer?"
  }')

echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

# Cleanup
echo ""
echo "3️⃣ Stopping API..."
kill $API_PID 2>/dev/null

echo ""
echo "✅ Test complete!"
echo ""
echo "Next steps:"
echo "  1. Set OPENAI_API_KEY in your environment"
echo "  2. Get a real question ID from your database"
echo "  3. Test with actual question data"

