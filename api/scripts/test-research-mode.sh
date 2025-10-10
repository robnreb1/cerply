#!/bin/bash
echo "==========================================================================="
echo "Testing Epic 6.5: Research Mode with Complex Numbers"
echo "==========================================================================="
echo ""

API_BASE="http://localhost:8080"
ADMIN_TOKEN="dev-admin-token-12345"

# Test: Complex Numbers (topic request)
echo "Step 1: Submit topic request..."
RESPONSE=$(curl -sS -X POST "$API_BASE/api/content/understand" \
  -H 'Content-Type: application/json' \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{"artefact": "Teach me complex numbers"}')

echo "$RESPONSE" | jq '.'

# Extract generation ID
GEN_ID=$(echo "$RESPONSE" | jq -r '.generationId')
INPUT_TYPE=$(echo "$RESPONSE" | jq -r '.inputType')

if [ "$INPUT_TYPE" = "topic" ]; then
  echo ""
  echo "✅ Correctly detected as TOPIC request"
else
  echo ""
  echo "❌ ERROR: Expected inputType='topic', got '$INPUT_TYPE'"
fi

echo ""
echo "Step 2: Trigger 3-LLM ensemble generation..."
curl -sS -X POST "$API_BASE/api/content/generate" \
  -H 'Content-Type: application/json' \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d "{\"generationId\": \"$GEN_ID\"}" | jq '.'

echo ""
echo "✅ Generation started!"
echo ""
echo "Waiting for generation (5 minutes - research mode takes longer)..."
echo "Checking status every 10 seconds..."
echo ""

# Poll for completion
MAX_WAIT=300
ELAPSED=0
INTERVAL=10

while [ $ELAPSED -lt $MAX_WAIT ]; do
  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
  
  POLL_RESPONSE=$(curl -sS "$API_BASE/api/content/generations/$GEN_ID" \
    -H "x-admin-token: $ADMIN_TOKEN")
  
  STATUS=$(echo "$POLL_RESPONSE" | jq -r '.status')
  
  echo "  [$ELAPSED s] Status: $STATUS"
  
  if [ "$STATUS" = "completed" ]; then
    echo ""
    echo "✅ GENERATION COMPLETED!"
    echo ""
    echo "==========================================================================="
    echo "RESULTS"
    echo "==========================================================================="
    echo "$POLL_RESPONSE" | jq '.'
    echo ""
    
    # Extract metrics
    MODULES=$(echo "$POLL_RESPONSE" | jq '.modules | length')
    CITATIONS=$(echo "$POLL_RESPONSE" | jq '.citations | length')
    COST=$(echo "$POLL_RESPONSE" | jq '.totalCost')
    TOKENS=$(echo "$POLL_RESPONSE" | jq '.totalTokens')
    TIME_MS=$(echo "$POLL_RESPONSE" | jq '.generationTimeMs')
    TIME_S=$((TIME_MS / 1000))
    
    echo "==========================================================================="
    echo "SUMMARY"
    echo "==========================================================================="
    echo "Modules Generated: $MODULES"
    echo "Citations Found: $CITATIONS"
    echo "Total Cost: \$$COST"
    echo "Total Tokens: $TOKENS"
    echo "Generation Time: ${TIME_S}s"
    echo ""
    
    # Check success criteria
    if [ "$MODULES" -ge 4 ] && [ "$CITATIONS" -ge 6 ]; then
      echo "✅ SUCCESS: Research mode generated quality content with citations!"
    else
      echo "⚠️  WARNING: Expected 4+ modules and 6+ citations, got $MODULES modules and $CITATIONS citations"
    fi
    
    exit 0
  elif [ "$STATUS" = "failed" ]; then
    echo ""
    echo "❌ GENERATION FAILED"
    echo "$POLL_RESPONSE" | jq '.'
    exit 1
  fi
done

echo ""
echo "⚠️  Generation did not complete within $MAX_WAIT seconds"
echo "Check manually: curl $API_BASE/api/content/generations/$GEN_ID -H 'x-admin-token: $ADMIN_TOKEN' | jq '.'"
exit 1

