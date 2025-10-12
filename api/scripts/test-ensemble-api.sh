#!/bin/bash
###############################################################################
# Quick test script for Epic 6 Ensemble Generation API
# Tests the actual endpoints we built
###############################################################################

set -e

API_BASE="${API_BASE:-http://localhost:8080}"
ADMIN_TOKEN="${ADMIN_TOKEN:-dev-admin-token-12345}"

echo "======================================================================="
echo "Testing Epic 6 Ensemble Generation API"
echo "======================================================================="
echo "API Base: $API_BASE"
echo ""

# Check if feature flag is enabled
echo "Step 1: Check feature flag..."
FF_CHECK=$(curl -sS "$API_BASE/api/health" | jq -r '.status' 2>/dev/null || echo "API not responding")
if [ "$FF_CHECK" != "ok" ]; then
  echo "⚠️  Warning: API may not be running at $API_BASE"
fi
echo ""

# Step 1: Submit artefact and get understanding
echo "Step 2: Submit artefact and get understanding..."
UNDERSTAND_RESPONSE=$(curl -sS -X POST "$API_BASE/api/content/understand" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "artefact": "Fire safety procedures: In case of fire, immediately evacuate the building using the nearest exit. Do not use lifts. Call 999 once outside. Meet at the assembly point in the car park. Do not re-enter until the fire marshal gives the all-clear."
  }')

echo "$UNDERSTAND_RESPONSE" | jq .

# Extract generation ID
GEN_ID=$(echo "$UNDERSTAND_RESPONSE" | jq -r '.generationId // empty')

if [ -z "$GEN_ID" ]; then
  echo "❌ Failed to get generationId. Response:"
  echo "$UNDERSTAND_RESPONSE" | jq .
  
  # Check if it's a feature flag issue
  ERROR_CODE=$(echo "$UNDERSTAND_RESPONSE" | jq -r '.error.code // empty')
  if [ "$ERROR_CODE" == "NOT_FOUND" ]; then
    echo ""
    echo "💡 Feature flag not enabled. Set FF_ENSEMBLE_GENERATION_V1=true"
  fi
  
  # Check if it's an API key issue
  if [ "$ERROR_CODE" == "LLM_UNAVAILABLE" ]; then
    echo ""
    echo "💡 LLM API keys not configured. Set:"
    echo "   export OPENAI_API_KEY=sk-..."
    echo "   export ANTHROPIC_API_KEY=sk-ant-..."
    echo "   export GOOGLE_API_KEY=..."
  fi
  
  exit 1
fi

echo ""
echo "✅ Understanding received. Generation ID: $GEN_ID"
echo ""

# Step 2: Optionally refine understanding
echo "Step 3: Refine understanding (optional)..."
REFINE_RESPONSE=$(curl -sS -X POST "$API_BASE/api/content/refine" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d "{
    \"generationId\": \"$GEN_ID\",
    \"feedback\": \"Focus more on the evacuation routes and assembly point procedures.\"
  }")

echo "$REFINE_RESPONSE" | jq .
echo ""

# Step 3: Trigger 3-LLM ensemble generation
echo "Step 4: Trigger 3-LLM ensemble generation..."
GENERATE_RESPONSE=$(curl -sS -X POST "$API_BASE/api/content/generate" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d "{
    \"generationId\": \"$GEN_ID\",
    \"contentType\": \"generic\"
  }")

echo "$GENERATE_RESPONSE" | jq .

STATUS=$(echo "$GENERATE_RESPONSE" | jq -r '.status // empty')
if [ "$STATUS" != "generating" ]; then
  echo "❌ Failed to start generation"
  exit 1
fi

echo ""
echo "✅ Generation started!"
echo ""

# Step 4: Poll for completion
echo "Step 5: Polling for completion (max 300 seconds - o3 reasoning takes 3-5 min)..."
TIMEOUT=300
ELAPSED=0
INTERVAL=5

while [ $ELAPSED -lt $TIMEOUT ]; do
  POLL_RESPONSE=$(curl -sS "$API_BASE/api/content/generations/$GEN_ID" \
    -H "x-admin-token: $ADMIN_TOKEN")
  
  CURRENT_STATUS=$(echo "$POLL_RESPONSE" | jq -r '.status // empty')
  PROGRESS=$(echo "$POLL_RESPONSE" | jq -r '.progress // 0')
  
  echo "  Status: $CURRENT_STATUS | Progress: $PROGRESS%"
  
  if [ "$CURRENT_STATUS" == "completed" ]; then
    echo ""
    echo "✅ Generation completed!"
    echo ""
    echo "Full response:"
    echo "$POLL_RESPONSE" | jq .
    
    # Extract summary
    MODULE_COUNT=$(echo "$POLL_RESPONSE" | jq -r '.modules | length')
    TOTAL_COST=$(echo "$POLL_RESPONSE" | jq -r '.totalCost // 0')
    TOTAL_TOKENS=$(echo "$POLL_RESPONSE" | jq -r '.totalTokens // 0')
    GEN_TIME=$(echo "$POLL_RESPONSE" | jq -r '.generationTimeMs // 0')
    
    echo ""
    echo "Summary:"
    echo "  Modules generated: $MODULE_COUNT"
    echo "  Total cost: \$$TOTAL_COST"
    echo "  Total tokens: $TOTAL_TOKENS"
    echo "  Generation time: ${GEN_TIME}ms"
    
    exit 0
  fi
  
  if [ "$CURRENT_STATUS" == "failed" ]; then
    echo ""
    echo "❌ Generation failed"
    echo "$POLL_RESPONSE" | jq .
    exit 1
  fi
  
  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done

echo ""
echo "⚠️  Generation did not complete within timeout"
echo "Check status manually: curl $API_BASE/api/content/generations/$GEN_ID -H 'x-admin-token: $ADMIN_TOKEN'"

