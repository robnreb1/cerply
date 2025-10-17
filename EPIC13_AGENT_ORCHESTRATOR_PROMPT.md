# Epic 13: Agent Orchestrator Architecture - Implementation Prompt

**Version:** 1.0  
**Date:** 2025-10-16  
**Status:** Ready for implementation  
**Owner:** Cerply Engineering (Agent to be assigned)

---

## Executive Summary

**Goal:** Refactor the conversational learning interface from pattern-matching + LLM enhancements to a full AI agent orchestrator with tool-calling architecture.

**Why:** The current system accumulates edge case handling through code changes. Every natural language variation requires new patterns or prompts. An agent orchestrator interprets intent naturally and routes to appropriate tools without code changes.

**Impact:** 
- Natural language understanding: 90% → 99%+
- Developer velocity: 2x faster for new edge cases
- User satisfaction: Eliminates "system confused" errors

**Timeline:** 24-28 hours (3-4 weeks)

---

## Problem Statement

### Current Architecture (Pattern-Based)

```
User Input ("learn something new")
  ↓
Intent Detection (LLM classification) → buckets: learning/shortcut/continue/other
  ↓
Pattern-based routing → if "learning" go to handleLearning()
  ↓
Workflow handlers (hardcoded logic)
  ↓
Edge case discovered → NEW CODE or PROMPT TUNING required
```

**Pain Points:**
- "learn something new" vs "teach me physics" → Requires code to distinguish meta-request from topic
- "it is" vs "yes" → Requires expanded affirmative patterns
- "physics please" vs "physics" → Requires filler word stripping
- First interaction vs deep conversation → Requires state tracking and conditional prompts

### Target Architecture (Agent-Based)

```
User Input ("learn something new")
  ↓
AI Agent (single LLM with full context + tool access)
  ↓
Agent decides: "User wants to restart, not learn a topic called 'something new'"
  ↓
Agent calls tool: confirmWithUser("What would you like to learn?")
  ↓
Agent synthesizes response naturally
```

**Benefits:**
- ✅ Handles ANY phrasing without code changes
- ✅ Full context awareness (6-turn memory)
- ✅ Natural conversation flow
- ✅ Adaptive to novel situations

---

## Scope & Deliverables

### Phase 1: Agent Infrastructure (8h)

**Deliverables:**
1. `api/src/services/agent-orchestrator.ts` - Core agent service
   - OpenAI function calling integration
   - Agent reasoning loop (max 5 iterations)
   - Tool execution framework
   - Error handling and fallbacks

2. `api/src/services/agent-tools.ts` - Tool registry
   - Tool interface definition
   - Tool registration system
   - Tool parameter validation
   - Tool execution with timeout

3. `api/src/services/agent-memory.ts` - Conversation state management
   - 30-day conversation retention
   - Decision point extraction
   - Context window management (last 6 messages)
   - User state persistence

4. `api/src/routes/agent.ts` - Agent API
   - `POST /api/agent/chat` - Main chat endpoint
   - `GET /api/agent/memory/:userId` - Retrieve history
   - `POST /api/agent/reset/:userId` - Clear state

5. Database migrations:
   - `020_agent_conversations.sql` - Store conversation history
   - `021_agent_tool_calls.sql` - Audit trail for tool execution

### Phase 2: Tool Migration (10h)

**Deliverables:**
6. Convert existing workflows to tools:
   - `searchTopics(query, userId)` - Find existing content in DB
   - `detectGranularity(input)` - Classify subject/topic/module
   - `getUserProgress(userId)` - Get active learning modules
   - `generateContent(topic, userId)` - Create new learning materials
   - `confirmWithUser(question)` - Ask clarification
   - `storeDecision(userId, decision)` - Log workflow decisions

7. Tool validation:
   - Parameter validation schemas
   - Error handling per tool
   - Timeout enforcement (10s default)
   - Result type checking

8. Tool composition:
   - Agent can chain tools (e.g., detectGranularity → searchTopics → confirmWithUser)
   - Tool results feed into subsequent reasoning
   - Cycle detection (no infinite loops)

### Phase 3: Agent Integration (8h)

**Deliverables:**
9. Frontend integration:
   - Update `web/app/page.tsx` to call `/api/agent/chat` when `FF_AGENT_ORCHESTRATOR_V1=true`
   - Maintain backward compatibility (feature flag controlled)
   - Handle streaming responses (optional)

10. Replace intent detection:
   - Current `POST /api/workflow/detect-intent` bypassed when agent enabled
   - Agent makes all routing decisions

11. A/B testing framework:
   - Route 10% traffic to agent, 90% to pattern-based
   - Log comparative metrics (latency, cost, accuracy)
   - Gradual rollout: 10% → 50% → 100%

12. Migration strategy:
   - Both systems run in parallel during transition
   - Feature flag controls which path is used
   - Rollback plan if agent underperforms

### Phase 4: Testing & Optimization (4-6h)

**Deliverables:**
13. Edge case testing:
   - 30+ test scenarios from backlog (see Test Suite below)
   - Automated test harness
   - Pass rate target: >95%

14. Performance optimization:
   - Target: <500ms p95 latency
   - LLM model selection (gpt-4o-mini vs gpt-4o)
   - Tool execution parallelization where possible
   - Caching for repeated tool calls

15. Cost optimization:
   - Monitor LLM token usage
   - Target: <$0.01 per conversation
   - Implement token budgets per request

16. Gradual rollout:
   - Week 1: 10% traffic
   - Week 2: 50% traffic (if metrics good)
   - Week 3: 100% traffic (if metrics excellent)
   - Rollback triggers: latency >1s p95, cost >$0.02/conv, accuracy <90%

---

## Technical Specification

### 1. Agent Orchestrator Service

**File:** `api/src/services/agent-orchestrator.ts`

**Core Responsibilities:**
- Maintain conversation context (last 6 messages)
- Call OpenAI with function calling
- Execute tools based on LLM decisions
- Synthesize final response
- Handle errors gracefully

**Key Methods:**
```typescript
class AgentOrchestrator {
  async chat(
    userId: string,
    userMessage: string,
    conversationHistory: AgentMessage[]
  ): Promise<AgentResponse>
  
  registerTool(tool: AgentTool): void
  
  private getSystemPrompt(): string
  
  private getToolDefinitions(): FunctionDefinition[]
  
  private executeToolCall(toolCall: ToolCall): Promise<any>
}
```

**System Prompt (Critical):**
```
You are Cerply, an intelligent learning assistant.

YOUR PERSONALITY:
- Well-spoken, understated, concise (Hugh Grant style)
- Professional but warm
- Never enthusiastic or sycophantic
- Use simple language, avoid jargon

YOUR TOOLS:
1. searchTopics(query) - Find existing learning content
2. detectGranularity(input) - Understand scope (subject/topic/module)
3. getUserProgress(userId) - See what user is learning
4. generateContent(topic, userId) - Create new learning materials
5. confirmWithUser(question) - Ask for clarification

HOW TO USE TOOLS:

When user wants to learn:
1. Call detectGranularity(input) to understand scope
2. If SUBJECT (broad): Guide them to specific topic with natural questions
3. If TOPIC (specific): Call searchTopics(query), then confirmWithUser()
4. If MODULE: Aggregate to parent topic

When user says meta-phrases ("learn something new", "try something else"):
- DO NOT call generateContent - this is a restart request
- Simply ask: "What would you like to learn?" (vary phrasing)

When user confirms ("yes", "sounds good", "it is"):
- Call generateContent(topic, userId)
- Respond: "Thank you. I'm putting that together now."

CRITICAL RULES:
- Always consider full conversation context (last 6 messages)
- Interpret affirmatives flexibly ("it is", "that's right", "sounds great")
- Never treat meta-requests as topics
- Use natural, varied language - no templates
- Call tools when needed, don't guess
```

### 2. Tool Definitions

**File:** `api/src/services/agent-tools.ts`

**Tool Interface:**
```typescript
interface AgentTool {
  name: string;
  description: string; // What this tool does (for LLM)
  parameters: JSONSchema; // OpenAI function calling schema
  execute: (params: any) => Promise<any>; // Tool logic
}
```

**Example: searchTopics**
```typescript
export const searchTopicsTool: AgentTool = {
  name: 'searchTopics',
  description: 'Search for existing learning content in our library. Use when user mentions a specific topic to see if we have content.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The topic to search for (e.g., "quantum physics")',
      },
      limit: {
        type: 'number',
        description: 'Max results (default: 5)',
        default: 5,
      },
    },
    required: ['query'],
  },
  async execute({ query, limit = 5, userId }) {
    const result = await searchTopics(query, limit, true);
    return {
      exactMatch: result.exactMatch,
      fuzzyMatches: result.fuzzyMatches,
      found: !!result.exactMatch || result.fuzzyMatches.length > 0,
    };
  },
};
```

### 3. Agent Memory Service

**File:** `api/src/services/agent-memory.ts`

**Responsibilities:**
- Store conversation history (30 days)
- Extract decision points
- Manage context window
- Persist to database

**Key Methods:**
```typescript
class AgentMemory {
  async storeMessage(
    userId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<void>
  
  async getConversationHistory(
    userId: string,
    limit: number = 6
  ): Promise<AgentMessage[]>
  
  async storeDecisionPoint(
    userId: string,
    decision: string,
    data: any
  ): Promise<void>
  
  async clearConversation(userId: string): Promise<void>
}
```

### 4. Database Schema

**Migration: `020_agent_conversations.sql`**
```sql
CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tool_calls JSONB, -- Array of tool calls made
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_conversations_user_id ON agent_conversations(user_id, timestamp DESC);
CREATE INDEX idx_agent_conversations_conversation_id ON agent_conversations(conversation_id);

-- Retention: Auto-delete after 30 days
CREATE INDEX idx_agent_conversations_timestamp ON agent_conversations(timestamp);
```

**Migration: `021_agent_tool_calls.sql`**
```sql
CREATE TABLE IF NOT EXISTS agent_tool_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  parameters JSONB NOT NULL,
  result JSONB,
  execution_time_ms INTEGER,
  error TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_tool_calls_user_id ON agent_tool_calls(user_id, timestamp DESC);
CREATE INDEX idx_agent_tool_calls_tool_name ON agent_tool_calls(tool_name);
```

---

## Test Suite

### Edge Cases (30+ scenarios)

**Meta-Request Detection:**
1. "learn something new" → restart, not topic
2. "let's try something else" → restart
3. "I want to learn something different" → restart
4. "pick something new" → restart
5. "show me other topics" → restart

**Affirmative Flexibility:**
6. "yes" → confirm
7. "it is" → confirm
8. "sounds great" → confirm
9. "that's correct" → confirm
10. "perfect" → confirm

**Rejection with Correction:**
11. "no, I meant physics" → extract "physics", restart
12. "actually, astrophysics" → extract "astrophysics"
13. "chemistry instead" → extract "chemistry"

**Granularity Detection:**
14. "physics" → subject
15. "quantum mechanics" → topic
16. "Schrödinger equation" → module
17. "leadership" → subject
18. "active listening" → topic

**Filler Words:**
19. "physics please" → subject (not topic because of "please")
20. "teach me quantum mechanics" → topic (ignore "teach me")
21. "I want to learn chemistry" → subject

**Conversation Depth:**
22. First request: "physics" → formal tone
23. After refinement: "astrophysics" → brief acknowledgment

**Natural Variations:**
24. "maths" → subject
25. "beginner maths" → subject + refinement needed
26. "particle physics" → topic

**Sensitive Topics:**
27. "self-harm" → serious, scientific response
28. Offensive content → polite decline

**Spelling Errors:**
29. "quantam fisics" → interpret as "quantum physics"
30. "ledarship" → interpret as "leadership"

**Performance:**
31. Response time: <500ms p95
32. Cost per conversation: <$0.01
33. No "system confused" errors

---

## A/B Testing Framework

### Metrics to Track

| Metric | Pattern-Based (Current) | Agent-Based (Target) |
|--------|------------------------|---------------------|
| Intent accuracy | 90% | >95% |
| Avg latency | 150ms | <500ms |
| Cost per conversation | $0.005 | <$0.01 |
| Edge case coverage | ~70% | >95% |
| "System confused" rate | ~5% | <1% |

### Rollout Plan

**Week 1: 10% Traffic**
- Monitor metrics closely
- Identify any unexpected failures
- Tune system prompt if needed

**Week 2: 50% Traffic** (if Week 1 metrics meet targets)
- Expand testing
- Cost validation ($0.01/conv ceiling)
- User feedback collection

**Week 3: 100% Traffic** (if Week 2 metrics excellent)
- Full cutover
- Deprecate pattern-based system (keep as fallback)

### Rollback Triggers

Immediately rollback to pattern-based if:
- Latency p95 > 1s
- Cost per conversation > $0.02
- Intent accuracy < 90%
- Error rate > 5%

---

## Integration Checklist

### Backend (API)

- [ ] `agent-orchestrator.ts` implemented
- [ ] `agent-tools.ts` with 6 core tools
- [ ] `agent-memory.ts` for conversation state
- [ ] `agent.ts` API routes
- [ ] Database migrations applied (020, 021)
- [ ] Feature flag `FF_AGENT_ORCHESTRATOR_V1` added
- [ ] Unit tests for each tool (6 tools × 3-5 tests = 20+ tests)
- [ ] Integration tests for agent reasoning loop (10 tests)

### Frontend (Web)

- [ ] `web/app/page.tsx` updated to check `FF_AGENT_ORCHESTRATOR_V1`
- [ ] Call `/api/agent/chat` when agent enabled
- [ ] Maintain backward compatibility
- [ ] Handle agent-specific errors gracefully

### Testing

- [ ] 30+ edge case scenarios automated
- [ ] Performance benchmarks (latency, cost)
- [ ] A/B testing harness (10% / 50% / 100% traffic routing)
- [ ] Monitoring dashboards (Grafana/Datadog)

### Documentation

- [ ] Agent architecture guide (`docs/architecture/agent-orchestrator.md`)
- [ ] Tool development guide (`docs/architecture/tool-development-guide.md`)
- [ ] Migration runbook (`AGENT_MIGRATION_RUNBOOK.md`)

---

## Success Criteria

### Functional

- [ ] Agent handles all 30+ edge case scenarios correctly
- [ ] No "system confused" errors in manual testing
- [ ] Conversation flows feel natural (user feedback)

### Performance

- [ ] Latency p95 < 500ms
- [ ] Cost per conversation < $0.01
- [ ] Tool execution < 200ms per tool

### Quality

- [ ] Intent accuracy > 95% (vs 90% current)
- [ ] Test coverage > 80%
- [ ] Zero regressions on existing workflows

### Business

- [ ] Developer velocity 2x faster for new edge cases (measure: days to implement new pattern)
- [ ] User satisfaction: "system understands me" sentiment >90%
- [ ] Reduced support tickets related to "system doesn't understand"

---

## Risk Mitigation

### Risk: Agent too slow (>500ms p95)

**Mitigation:**
- Use `gpt-4o-mini` for most conversations (faster, cheaper)
- Reserve `gpt-4o` for complex multi-tool scenarios
- Parallelize tool execution where possible
- Implement aggressive caching

### Risk: Agent too expensive (>$0.01/conv)

**Mitigation:**
- Monitor token usage per request
- Implement token budgets (max 4000 tokens per conversation)
- Use conversation history pruning (keep last 6 messages only)
- Optimize system prompt length

### Risk: Agent makes wrong tool calls

**Mitigation:**
- Comprehensive tool descriptions in system prompt
- Tool parameter validation (reject invalid calls)
- Fallback to pattern-based system if agent fails 3+ times
- Monitoring and alerts for tool errors

### Risk: Infinite reasoning loops

**Mitigation:**
- Hard limit: 5 iterations max
- Cycle detection (if same tool called twice with same params, stop)
- Timeout: 30s total per request

---

## Appendix: Code Skeletons

### A. Agent Orchestrator Core

```typescript
// api/src/services/agent-orchestrator.ts
import OpenAI from 'openai';

export class AgentOrchestrator {
  private tools: Map<string, AgentTool> = new Map();
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.registerDefaultTools();
  }
  
  async chat(
    userId: string,
    userMessage: string,
    conversationHistory: AgentMessage[]
  ): Promise<AgentResponse> {
    const systemPrompt = this.getSystemPrompt();
    
    conversationHistory.push({
      role: 'user',
      content: userMessage,
    });
    
    const toolCalls: ToolCall[] = [];
    let agentResponse = '';
    
    // Agent reasoning loop (max 5 iterations)
    for (let iteration = 0; iteration < 5; iteration++) {
      const completion = await this.openai.chat.completions.create({
        model: process.env.AGENT_LLM_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
        ],
        tools: this.getToolDefinitions(),
        tool_choice: 'auto',
        temperature: 0.3,
      });
      
      const message = completion.choices[0].message;
      
      // No more tool calls, agent is done
      if (!message.tool_calls || message.tool_calls.length === 0) {
        agentResponse = message.content || '';
        break;
      }
      
      // Execute tool calls
      for (const toolCall of message.tool_calls) {
        const result = await this.executeToolCall(toolCall);
        toolCalls.push({
          toolName: toolCall.function.name,
          parameters: JSON.parse(toolCall.function.arguments),
          result,
        });
      }
    }
    
    return {
      message: agentResponse,
      toolCalls,
      conversationHistory,
    };
  }
  
  private getSystemPrompt(): string {
    // See "System Prompt (Critical)" section above
  }
  
  private async executeToolCall(toolCall: any): Promise<any> {
    const tool = this.tools.get(toolCall.function.name);
    if (!tool) {
      throw new Error(`Unknown tool: ${toolCall.function.name}`);
    }
    
    const params = JSON.parse(toolCall.function.arguments);
    return await tool.execute(params);
  }
}
```

### B. Tool Example

```typescript
// api/src/services/agent-tools.ts
export const detectGranularityTool: AgentTool = {
  name: 'detectGranularity',
  description: 'Classify input as subject (broad), topic (focused), or module (specific)',
  parameters: {
    type: 'object',
    properties: {
      input: {
        type: 'string',
        description: 'The user\'s learning request',
      },
    },
    required: ['input'],
  },
  async execute({ input }) {
    const granularity = detectGranularity(input);
    return {
      granularity,
      reasoning: granularity === 'subject' 
        ? 'Broad domain-level request' 
        : granularity === 'topic'
        ? 'Focused skill or concept'
        : 'Very specific module or technique',
    };
  },
};
```

### C. Frontend Integration

```typescript
// web/app/page.tsx (simplified)
const handleSend = async () => {
  const useAgent = process.env.NEXT_PUBLIC_FF_AGENT_ORCHESTRATOR_V1 === 'true';
  
  if (useAgent) {
    // Agent orchestrator path
    const response = await fetch('/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        message: userInput,
        conversationHistory: messages,
      }),
    });
    
    const data = await response.json();
    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'assistant',
      content: data.message,
    }]);
  } else {
    // Existing pattern-based path (fallback)
    // ... existing code ...
  }
};
```

---

## Questions for Implementation Agent

1. **LLM Model Choice:** Should we default to `gpt-4o-mini` for speed/cost, or `gpt-4o` for quality? (Recommendation: `gpt-4o-mini` initially, monitor accuracy)

2. **Streaming Responses:** Should the agent stream responses token-by-token, or send complete messages? (Recommendation: Complete messages initially for simplicity)

3. **Tool Parallelization:** Can we execute multiple tools in parallel if agent calls them simultaneously? (Recommendation: Yes, but ensure no data dependencies)

4. **Fallback Strategy:** If agent fails 3 times, should we fall back to pattern-based system automatically? (Recommendation: Yes, with user notification)

5. **Tool Versioning:** How do we handle tool signature changes without breaking existing conversations? (Recommendation: Version tools, maintain backward compatibility for 30 days)

---

## Final Notes

This epic represents a **fundamental architectural shift** from pattern-matching to AI-driven orchestration. The investment is significant (24-28h) but the payoff is substantial:

- **Eliminates edge case accumulation** - No more "learn something new" vs "teach me physics" code
- **Natural language by default** - Users can speak freely, system adapts
- **Developer velocity** - New conversational patterns handled automatically

The A/B testing framework ensures we can validate the approach before full commitment. The parallel execution strategy (running alongside Epic 6.6) means we don't block content generation.

**Go/No-Go Decision Point:** After Phase 1 (8h), we'll have the agent infrastructure. At that point, we can test a simple conversation flow and decide whether to proceed with full migration. If the agent is too slow or expensive, we can pause and optimize before continuing.

---

**Ready to implement?** This prompt contains everything needed to build Epic 13. Hand it to a new agent and they can execute autonomously. Return here with outcomes for integration with Epic 6.6.

---

**End of Implementation Prompt**

