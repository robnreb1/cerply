#!/usr/bin/env bash
set -e

echo "🧪 Epic 14 v2.0 - Agentic Conversational Module Builder UAT"
echo "=============================================================="
echo ""

API="${API_BASE:-http://localhost:8080}"
MANAGER_USER_ID="00000000-0000-0000-0000-000000000003"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
PASS_COUNT=0
FAIL_COUNT=0

function print_test() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "TEST $1: $2"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

function pass() {
  echo -e "${GREEN}✅ PASS${NC}: $1"
  ((PASS_COUNT++))
}

function fail() {
  echo -e "${RED}❌ FAIL${NC}: $1"
  ((FAIL_COUNT++))
}

function warn() {
  echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

# ============================================================================
# PRE-TEST: Setup
# ============================================================================

echo "📋 Pre-Test Setup"
echo "────────────────────────────────────────────────────────────"

# Check API is running
echo "Checking API health..."
HEALTH=$(curl -s "$API/api/health" | jq -r '.ok' 2>/dev/null || echo "false")
if [ "$HEALTH" != "true" ]; then
  echo -e "${RED}❌ API is not running at $API${NC}"
  echo "Please start the API server: cd api && npm run dev"
  exit 1
fi
echo -e "${GREEN}✅ API is running${NC}"

# Check if OpenAI key is set
echo "Checking OpenAI configuration..."
OPENAI_ENABLED=$(curl -s "$API/api/health" | jq -r '.planner.enabled' 2>/dev/null || echo "false")
if [ "$OPENAI_ENABLED" != "true" ]; then
  warn "OpenAI API is not enabled - will test fallback heuristic mode"
  warn "To test LLM mode, set OPENAI_API_KEY environment variable"
else
  echo -e "${GREEN}✅ OpenAI API is enabled - will test agentic LLM mode${NC}"
fi

# Get manager session
echo "Getting manager session..."
SESSION_COOKIE=$(curl -s -i "$API/api/dev/login-as-manager?redirect=http://localhost:3000" 2>/dev/null | grep -i "set-cookie: cerply.sid" | sed 's/.*cerply.sid=\([^;]*\).*/\1/' | head -1)

if [ -z "$SESSION_COOKIE" ]; then
  echo -e "${RED}❌ Could not get manager session${NC}"
  echo "Trying alternative auth method..."
  # Try direct session creation (for testing)
  SESSION_COOKIE="test-manager-session-$(date +%s)"
  warn "Using test session cookie (may not work with RBAC)"
fi

echo -e "${GREEN}✅ Session: ${SESSION_COOKIE:0:20}...${NC}"
echo ""

# ============================================================================
# UAT-1: Natural Context Inference
# ============================================================================

print_test "UAT-1" "Natural Context Inference"
echo "Objective: Verify agent infers context (doesn't ask obvious questions)"
echo ""
echo "Manager says: 'I need to train my sales team on our new product pricing model'"
echo ""

RESPONSE=$(curl -s -X POST "$API/api/curator/modules/conversation" \
  -H "Content-Type: application/json" \
  -H "Cookie: cerply.sid=$SESSION_COOKIE" \
  -d '{
    "userMessage": "I need to train my sales team on our new product pricing model",
    "conversationHistory": []
  }' 2>/dev/null)

# Check if we got an error
ERROR=$(echo "$RESPONSE" | jq -r '.error.code' 2>/dev/null)
if [ "$ERROR" != "null" ] && [ -n "$ERROR" ]; then
  fail "API returned error: $ERROR - $(echo "$RESPONSE" | jq -r '.error.message')"
  echo "Response: $RESPONSE"
else
  # Parse response
  AGENT_MESSAGE=$(echo "$RESPONSE" | jq -r '.agentMessage' 2>/dev/null)
  SUGGESTIONS=$(echo "$RESPONSE" | jq -r '.suggestions[]' 2>/dev/null | tr '\n' ',' | sed 's/,$//')
  
  echo "Agent Response:"
  echo "─────────────────────────────────────────────────────────────"
  echo "$AGENT_MESSAGE" | fold -s -w 60
  echo "─────────────────────────────────────────────────────────────"
  
  if [ -n "$SUGGESTIONS" ]; then
    echo "Suggestions: [$SUGGESTIONS]"
  fi
  echo ""
  
  # Test: Should NOT ask "What topic?"
  if echo "$AGENT_MESSAGE" | grep -iq "what topic"; then
    fail "Agent asked 'what topic' (should have inferred from 'pricing model')"
  else
    pass "Agent did not ask obvious 'what topic' question"
  fi
  
  # Test: Should infer sales team
  if echo "$AGENT_MESSAGE" | grep -iq "sales"; then
    pass "Agent acknowledged sales team context"
  else
    warn "Agent didn't explicitly mention 'sales' (may have inferred silently)"
  fi
  
  # Test: Should ask smart question (documents, experience, deadline)
  if echo "$AGENT_MESSAGE" | grep -Eiq "document|material|deck|upload|experience|deadline"; then
    pass "Agent asked smart clarifying question"
  else
    fail "Agent didn't ask smart follow-up questions"
  fi
  
  # Test: Response should be conversational
  if echo "$AGENT_MESSAGE" | grep -Eq "Great|Perfect|I'll|Let's|help"; then
    pass "Response uses natural, conversational tone"
  else
    warn "Response may be too formal or robotic"
  fi
fi

# Save conversation ID for next test
CONV_ID=$(echo "$RESPONSE" | jq -r '.conversationId' 2>/dev/null)

# ============================================================================
# UAT-2: Loop-Guard (No Repeated Questions)
# ============================================================================

print_test "UAT-2" "Loop-Guard - No Repeated Questions"
echo "Objective: Verify agent doesn't ask the same question twice"
echo ""
echo "Manager says: 'They're experienced sellers, need them ready by Jan 15'"
echo ""

RESPONSE2=$(curl -s -X POST "$API/api/curator/modules/conversation" \
  -H "Content-Type: application/json" \
  -H "Cookie: cerply.sid=$SESSION_COOKIE" \
  -d "{
    \"conversationId\": \"$CONV_ID\",
    \"userMessage\": \"They're experienced sellers, need them ready by Jan 15\",
    \"conversationHistory\": [
      {\"role\": \"manager\", \"content\": \"I need to train my sales team on our new product pricing model\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"},
      {\"role\": \"agent\", \"content\": $(echo "$AGENT_MESSAGE" | jq -Rs .), \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}
    ]
  }" 2>/dev/null)

ERROR2=$(echo "$RESPONSE2" | jq -r '.error.code' 2>/dev/null)
if [ "$ERROR2" != "null" ] && [ -n "$ERROR2" ]; then
  fail "API returned error: $ERROR2"
else
  AGENT_MESSAGE2=$(echo "$RESPONSE2" | jq -r '.agentMessage' 2>/dev/null)
  MODULE_PREVIEW=$(echo "$RESPONSE2" | jq -r '.modulePreview' 2>/dev/null)
  
  echo "Agent Response:"
  echo "─────────────────────────────────────────────────────────────"
  echo "$AGENT_MESSAGE2" | fold -s -w 60
  echo "─────────────────────────────────────────────────────────────"
  echo ""
  
  # Test: Should NOT ask about experience level again
  if echo "$AGENT_MESSAGE2" | grep -iq "experience level"; then
    fail "Agent asked about experience level again (already answered)"
  else
    pass "Agent did not repeat 'experience level' question"
  fi
  
  # Test: Should NOT ask about deadline again
  if echo "$AGENT_MESSAGE2" | grep -iq "when do you need"; then
    fail "Agent asked about deadline again (already answered)"
  else
    pass "Agent did not repeat 'deadline' question"
  fi
  
  # Test: Should generate preview or ask remaining question
  if [ "$MODULE_PREVIEW" != "null" ]; then
    pass "Agent generated module preview (has enough info)"
    
    # Parse preview details
    MODULE_TITLE=$(echo "$RESPONSE2" | jq -r '.modulePreview.title' 2>/dev/null)
    TARGET_LEVEL=$(echo "$RESPONSE2" | jq -r '.modulePreview.targetMasteryLevel' 2>/dev/null)
    EST_MINUTES=$(echo "$RESPONSE2" | jq -r '.modulePreview.estimatedMinutes' 2>/dev/null)
    BLOCK_COUNT=$(echo "$RESPONSE2" | jq -r '.modulePreview.contentBlocks | length' 2>/dev/null)
    
    echo ""
    echo "📊 Module Preview Generated:"
    echo "  Title: $MODULE_TITLE"
    echo "  Target Level: $TARGET_LEVEL"
    echo "  Estimated: $EST_MINUTES minutes"
    echo "  Content Blocks: $BLOCK_COUNT sections"
    
    if [ -n "$MODULE_TITLE" ] && [ "$MODULE_TITLE" != "null" ]; then
      pass "Module has specific title"
    fi
    
    if [ "$BLOCK_COUNT" -ge 3 ] && [ "$BLOCK_COUNT" -le 8 ]; then
      pass "Module has appropriate number of sections ($BLOCK_COUNT)"
    else
      warn "Module has unusual section count: $BLOCK_COUNT"
    fi
  else
    # May ask one more question (e.g., about proprietary content)
    if echo "$AGENT_MESSAGE2" | grep -Eiq "document|material|upload"; then
      pass "Agent asks about proprietary content (reasonable)"
    else
      warn "Agent didn't generate preview yet (may need more info)"
    fi
  fi
fi

# ============================================================================
# UAT-3: One-Shot Module Creation
# ============================================================================

print_test "UAT-3" "One-Shot Module Creation (All Info Provided)"
echo "Objective: Verify agent generates preview immediately when given all info"
echo ""
echo "Manager says: 'Train my engineering team on TypeScript generics. They're"
echo "              intermediate level. Need 85% proficiency by Dec 1st.'"
echo ""

RESPONSE3=$(curl -s -X POST "$API/api/curator/modules/conversation" \
  -H "Content-Type: application/json" \
  -H "Cookie: cerply.sid=$SESSION_COOKIE" \
  -d '{
    "userMessage": "Train my engineering team on TypeScript generics. They're intermediate level. Need 85% proficiency by Dec 1st.",
    "conversationHistory": []
  }' 2>/dev/null)

ERROR3=$(echo "$RESPONSE3" | jq -r '.error.code' 2>/dev/null)
if [ "$ERROR3" != "null" ] && [ -n "$ERROR3" ]; then
  fail "API returned error: $ERROR3"
else
  AGENT_MESSAGE3=$(echo "$RESPONSE3" | jq -r '.agentMessage' 2>/dev/null)
  MODULE_PREVIEW3=$(echo "$RESPONSE3" | jq -r '.modulePreview' 2>/dev/null)
  
  echo "Agent Response:"
  echo "─────────────────────────────────────────────────────────────"
  echo "$AGENT_MESSAGE3" | fold -s -w 60
  echo "─────────────────────────────────────────────────────────────"
  echo ""
  
  # Test: Should generate preview immediately (all info provided)
  if [ "$MODULE_PREVIEW3" != "null" ]; then
    pass "Agent generated preview on first turn (all info provided)"
    
    MODULE_TITLE3=$(echo "$RESPONSE3" | jq -r '.modulePreview.title' 2>/dev/null)
    echo ""
    echo "📊 Module Preview: $MODULE_TITLE3"
    
    # Test: Title should be specific, not generic
    if echo "$MODULE_TITLE3" | grep -iq "typescript"; then
      pass "Title is specific (mentions TypeScript)"
    else
      warn "Title may be too generic: $MODULE_TITLE3"
    fi
    
    # Test: Target proficiency should match request (85%)
    TARGET_PROF=$(echo "$RESPONSE3" | jq -r '.modulePreview.targetProficiencyPct' 2>/dev/null)
    if [ "$TARGET_PROF" == "85" ]; then
      pass "Target proficiency matches request (85%)"
    else
      warn "Target proficiency is $TARGET_PROF% (requested 85%)"
    fi
  else
    fail "Agent didn't generate preview (all required info was provided)"
  fi
fi

# ============================================================================
# UAT-4: Natural Refinement
# ============================================================================

print_test "UAT-4" "Natural Refinement"
echo "Objective: Verify agent handles refinements naturally"
echo ""

if [ "$MODULE_PREVIEW3" != "null" ]; then
  echo "Manager says: 'Add a section on advanced patterns like mapped types'"
  echo ""
  
  RESPONSE4=$(curl -s -X POST "$API/api/curator/modules/conversation" \
    -H "Content-Type: application/json" \
    -H "Cookie: cerply.sid=$SESSION_COOKIE" \
    -d "{
      \"conversationId\": \"$(echo "$RESPONSE3" | jq -r '.conversationId')\",
      \"userMessage\": \"Add a section on advanced patterns like mapped types\",
      \"conversationHistory\": [
        {\"role\": \"manager\", \"content\": \"Train my engineering team on TypeScript generics. They're intermediate level. Need 85% proficiency by Dec 1st.\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"},
        {\"role\": \"agent\", \"content\": $(echo "$AGENT_MESSAGE3" | jq -Rs .), \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}
      ]
    }" 2>/dev/null)
  
  ERROR4=$(echo "$RESPONSE4" | jq -r '.error.code' 2>/dev/null)
  if [ "$ERROR4" != "null" ] && [ -n "$ERROR4" ]; then
    fail "API returned error: $ERROR4"
  else
    AGENT_MESSAGE4=$(echo "$RESPONSE4" | jq -r '.agentMessage' 2>/dev/null)
    MODULE_PREVIEW4=$(echo "$RESPONSE4" | jq -r '.modulePreview' 2>/dev/null)
    
    echo "Agent Response:"
    echo "─────────────────────────────────────────────────────────────"
    echo "$AGENT_MESSAGE4" | fold -s -w 60
    echo "─────────────────────────────────────────────────────────────"
    echo ""
    
    # Test: Agent should acknowledge naturally
    if echo "$AGENT_MESSAGE4" | grep -Eiq "great|added|perfect|I'll add|I've added"; then
      pass "Agent acknowledged refinement naturally"
    else
      warn "Agent response may not acknowledge refinement clearly"
    fi
    
    # Test: Should show updated preview
    if [ "$MODULE_PREVIEW4" != "null" ]; then
      pass "Agent provided updated module preview"
      
      BLOCK_COUNT4=$(echo "$RESPONSE4" | jq -r '.modulePreview.contentBlocks | length' 2>/dev/null)
      BLOCK_COUNT3=$(echo "$RESPONSE3" | jq -r '.modulePreview.contentBlocks | length' 2>/dev/null)
      
      if [ "$BLOCK_COUNT4" -gt "$BLOCK_COUNT3" ]; then
        pass "Content blocks increased ($BLOCK_COUNT3 → $BLOCK_COUNT4)"
      else
        warn "Content blocks didn't increase ($BLOCK_COUNT3 → $BLOCK_COUNT4)"
      fi
    else
      fail "Agent didn't provide updated preview after refinement"
    fi
  fi
else
  warn "Skipping UAT-4 (no module preview from UAT-3)"
fi

# ============================================================================
# Summary
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "                       TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "✅ Passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "❌ Failed: ${RED}$FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  ✅ ALL TESTS PASSED! Epic 14 v2.0 Agentic Implementation${NC}"
  echo -e "${GREEN}     is ready for manual UAT and staging deployment.${NC}"
  echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
  exit 0
else
  echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
  echo -e "${RED}  ❌ SOME TESTS FAILED - Review failures above${NC}"
  echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
  exit 1
fi

