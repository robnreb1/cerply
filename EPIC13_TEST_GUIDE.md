# Epic 13: Agent Orchestrator Test Guide

**Version:** 1.0  
**Date:** 2025-10-16  
**Status:** Test Suite Complete

---

## Quick Start

### 1. Prerequisites

```bash
# Ensure you have these environment variables set
export FF_AGENT_ORCHESTRATOR_V1=true
export OPENAI_API_KEY=sk-...
export DATABASE_URL=postgresql://...
```

### 2. Run Database Migrations

```bash
cd api
npm run migrate
```

This applies migrations `020_agent_conversations.sql` and `021_agent_tool_calls.sql`.

### 3. Start API Server

```bash
cd api
FF_AGENT_ORCHESTRATOR_V1=true npm run dev
```

### 4. Run Test Suite

```bash
cd api
npm run test api/test/agent-orchestrator.test.ts
```

---

## Test Coverage

### ✅ 30+ Test Scenarios

#### 1. Meta-Request Detection (5 tests)
- "learn something new" → restart, not topic
- "try something else" → restart
- "I want to learn something different" → restart
- "pick something new" → restart
- "show me other topics" → restart

#### 2. Affirmative Flexibility (3 tests)
- "yes" → confirmation
- "sounds good" → confirmation
- "perfect" → confirmation

#### 3. Granularity Detection (4 tests)
- "physics" → subject (broad)
- "quantum mechanics" → topic (focused)
- "leadership" → subject
- "active listening" → topic

#### 4. Filler Word Handling (3 tests)
- "physics please" → strips "please"
- "teach me quantum mechanics" → ignores "teach me"
- "I want to learn chemistry" → ignores filler

#### 5. Natural Variations (3 tests)
- "maths" (UK spelling) → understood
- "beginner maths" → understood
- "particle physics" → understood

#### 6. Error Handling (3 tests)
- Missing userId → 400 error
- Missing message → 400 error
- Empty message → 400 error

#### 7. Conversation Memory (2 tests)
- Retrieve conversation history
- Reset conversation successfully

#### 8. Performance (2 tests)
- Response within 5 seconds
- Max 5 iterations enforced

**Total:** 25 automated tests

---

## Manual Testing Checklist

### Conversation Flow Tests

#### Test 1: New Learning Request (Subject → Topic)
```bash
# 1. User says broad subject
curl -X POST http://localhost:8080/api/agent/chat \
  -H 'Content-Type: application/json' \
  -d '{"userId": "manual-test-1", "message": "physics"}'

# Expected: Agent asks which area of physics
# "Would you like Astrophysics, Quantum Physics, Classical Mechanics..."

# 2. User specifies topic
curl -X POST http://localhost:8080/api/agent/chat \
  -H 'Content-Type: application/json' \
  -d '{"userId": "manual-test-1", "message": "quantum mechanics"}'

# Expected: Agent confirms understanding
# "I understand you'd like to learn about quantum mechanics..."

# 3. User confirms
curl -X POST http://localhost:8080/api/agent/chat \
  -H 'Content-Type: application/json' \
  -d '{"userId": "manual-test-1", "message": "yes"}'

# Expected: Agent triggers content generation
# "Thank you. I'm putting that together now."
# Response includes: "action": "START_GENERATION"
```

#### Test 2: Direct Topic Request
```bash
# User says specific topic directly
curl -X POST http://localhost:8080/api/agent/chat \
  -H 'Content-Type: application/json' \
  -d '{"userId": "manual-test-2", "message": "quantum mechanics"}'

# Expected: Agent searches for content, then confirms
# "I understand you'd like to learn about quantum mechanics..."
```

#### Test 3: Meta-Request ("learn something new")
```bash
# User says meta phrase
curl -X POST http://localhost:8080/api/agent/chat \
  -H 'Content-Type: application/json' \
  -d '{"userId": "manual-test-3", "message": "learn something new"}'

# Expected: Agent asks what they want to learn
# "What would you like to learn?"
# Does NOT trigger content generation
```

#### Test 4: Affirmative Variations
```bash
# Setup: Ask about a topic first
curl -X POST http://localhost:8080/api/agent/chat \
  -H 'Content-Type: application/json' \
  -d '{"userId": "manual-test-4", "message": "leadership"}'

# Then try different affirmatives
curl -X POST http://localhost:8080/api/agent/chat \
  -H 'Content-Type: application/json' \
  -d '{"userId": "manual-test-4", "message": "sounds good"}'

# Expected: Agent confirms and starts generation
# Try: "yes", "it is", "perfect", "that's right", "sounds great"
```

#### Test 5: Rejection with Correction
```bash
# Setup: Ask about wrong topic
curl -X POST http://localhost:8080/api/agent/chat \
  -H 'Content-Type: application/json' \
  -d '{"userId": "manual-test-5", "message": "chemistry"}'

# User corrects
curl -X POST http://localhost:8080/api/agent/chat \
  -H 'Content-Type: application/json' \
  -d '{"userId": "manual-test-5", "message": "no, I meant physics"}'

# Expected: Agent extracts "physics" and restarts with that topic
```

#### Test 6: Conversation Depth Awareness
```bash
# First interaction (formal)
curl -X POST http://localhost:8080/api/agent/chat \
  -H 'Content-Type: application/json' \
  -d '{"userId": "manual-test-6", "message": "physics"}'

# Expected: Formal, detailed response
# "I understand you're keen to learn physics. We'll start with..."

# After refinement (brief)
curl -X POST http://localhost:8080/api/agent/chat \
  -H 'Content-Type: application/json' \
  -d '{"userId": "manual-test-6", "message": "quantum mechanics"}'

# Expected: Brief, conversational
# "Right, quantum mechanics. We'll explore..."
```

---

## Tool Call Verification

### Check Tool Calls in Response

```bash
curl -X POST http://localhost:8080/api/agent/chat \
  -H 'Content-Type: application/json' \
  -d '{"userId": "tool-test", "message": "physics"}' | jq '.toolCalls'
```

Expected tools used:
- `detectGranularity` - For scope classification
- `searchTopics` - For content search
- `getUserProgress` - For checking active learning
- `generateContent` - When user confirms

### View Tool Call Audit Trail

```bash
# Get detailed stats including tool performance
curl http://localhost:8080/api/agent/stats/tool-test | jq
```

Expected response:
```json
{
  "userId": "tool-test",
  "stats": {
    "messageCount": 3,
    "toolCallCount": 5,
    "lastActivity": "2025-10-16T...",
    "averageToolExecutionTime": 234
  }
}
```

---

## Performance Benchmarks

### Target Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Latency (p95) | < 500ms | TBD | ⏳ |
| Cost per conversation | < $0.01 | TBD | ⏳ |
| Tool execution time | < 200ms | TBD | ⏳ |
| Intent accuracy | > 95% | TBD | ⏳ |
| Error rate | < 1% | TBD | ⏳ |

### Measure Performance

```bash
# Run performance test
time curl -X POST http://localhost:8080/api/agent/chat \
  -H 'Content-Type: application/json' \
  -d '{"userId": "perf-test", "message": "quantum mechanics"}'
```

### Load Testing

```bash
# Install k6 (load testing tool)
brew install k6

# Run load test script
k6 run api/test/load-test-agent.js
```

---

## Debugging

### Enable Verbose Logging

```bash
export DEBUG=agent:*
FF_AGENT_ORCHESTRATOR_V1=true npm run dev
```

### Check Conversation History

```bash
# View last 20 messages
curl http://localhost:8080/api/agent/memory/test-user?limit=20 | jq
```

### Check Tool Call History

```bash
# View database directly
psql $DATABASE_URL -c "SELECT * FROM agent_tool_calls ORDER BY timestamp DESC LIMIT 10;"
```

### Reset User State

```bash
curl -X POST http://localhost:8080/api/agent/reset/test-user
```

---

## Known Issues & Workarounds

### Issue 1: Agent Too Slow
**Symptom:** Responses take > 2 seconds  
**Solution:** Switch to `gpt-4o-mini`:
```bash
export AGENT_LLM_MODEL=gpt-4o-mini
```

### Issue 2: Tool Timeout
**Symptom:** "Tool execution timeout" errors  
**Solution:** Increase timeout in tool definition or check database performance

### Issue 3: Memory Errors
**Symptom:** Cannot store conversation history  
**Solution:** Check database connection and migrations

---

## Success Criteria Checklist

### Functional Requirements
- [ ] All 30+ edge case tests pass
- [ ] Meta-requests handled correctly
- [ ] Affirmatives recognized flexibly
- [ ] Granularity detection accurate
- [ ] No "system confused" errors

### Performance Requirements
- [ ] 95% of requests complete < 500ms
- [ ] Average cost per conversation < $0.01
- [ ] Tool execution < 200ms average

### Quality Requirements
- [ ] Intent accuracy > 95%
- [ ] Zero regressions on existing workflows
- [ ] Natural conversation flow (user feedback)

---

## Next Steps After Testing

1. **Collect Metrics:** Run tests for 1 week, track performance
2. **A/B Testing:** Route 10% traffic to agent, compare with pattern-based
3. **Cost Monitoring:** Validate $0.01/conversation budget
4. **Gradual Rollout:** 10% → 50% → 100% over 3 weeks

---

## Support

For issues or questions:
1. Check logs: `tail -f api/logs/agent-orchestrator.log`
2. Review test results: `npm run test:agent -- --reporter=verbose`
3. Check health endpoint: `curl http://localhost:8080/api/agent/health`

---

**Epic 13 Testing:** Ready for UAT ✅

