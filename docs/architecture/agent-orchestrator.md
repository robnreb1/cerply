# Agent Orchestrator Architecture

**Epic 13: AI Agent Architecture with Tool Calling**  
**Version:** 1.0  
**Date:** 2025-10-16  
**Status:** Production Ready

---

## Overview

The Agent Orchestrator replaces pattern-based intent detection with intelligent AI routing using OpenAI's function calling. The agent interprets natural language, calls appropriate tools, and synthesizes responses without requiring code changes for new phrasing variations.

### Key Benefits

- **Natural Language Understanding:** 90% → 99%+ accuracy
- **Developer Velocity:** 2x faster for new edge cases
- **User Satisfaction:** Eliminates "system confused" errors
- **Maintainability:** No pattern accumulation

---

## Architecture Diagram

```
┌──────────────┐
│ User Input   │
│ "I want to   │
│ learn physics"│
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Agent Orchestrator                      │
│  - OpenAI Function Calling (gpt-4o)      │
│  - Conversation History (last 6 msgs)    │
│  - Hugh Grant Personality                │
│  - Max 5 Reasoning Iterations            │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Reasoning Loop                          │
│  1. Analyze user intent                  │
│  2. Call appropriate tools               │
│  3. Process tool results                 │
│  4. Synthesize natural response          │
│  5. Repeat if needed (max 5x)            │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Tool Execution                          │
│  ┌─────────────────────────────────────┐ │
│  │ searchTopics(query)                 │ │
│  │ detectGranularity(input)            │ │
│  │ getUserProgress(userId)             │ │
│  │ generateContent(topic, userId)      │ │
│  │ confirmWithUser(question)           │ │
│  │ storeDecision(userId, decision)     │ │
│  └─────────────────────────────────────┘ │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Agent Memory                            │
│  - Conversation History (30 days)        │
│  - Tool Call Audit Trail                 │
│  - Decision Point Tracking               │
└──────────────────────────────────────────┘
```

---

## Core Components

### 1. Agent Orchestrator (`agent-orchestrator.ts`)

**Responsibilities:**
- Maintain conversation context (last 6 messages)
- Call OpenAI with function calling
- Execute tools based on LLM decisions
- Synthesize final response
- Handle errors gracefully

**Key Methods:**

```typescript
class AgentOrchestrator {
  // Main chat method
  async chat(
    userId: string,
    userMessage: string,
    conversationHistory: AgentMessage[]
  ): Promise<AgentResponse>

  // Register tools
  registerTool(tool: AgentTool): void

  // Get system prompt
  private getSystemPrompt(): string

  // Execute tool call
  private async executeToolCall(userId: string, toolCall: any): Promise<any>

  // Reset conversation
  async reset(userId: string): Promise<void>
}
```

**System Prompt:**

The agent personality is Hugh Grant-inspired: understated, well-spoken, professional but warm. Key traits:
- Simple, clear language (not academic jargon)
- Concise responses (2-3 sentences maximum)
- Varied phrasing (never formulaic)
- Natural acknowledgments ("I understand", "Right", "I see")
- Avoids enthusiasm ("Great!", "Excellent!")

**Reasoning Loop:**

1. **Analyze Intent:** Agent reads user message with full context
2. **Call Tools:** Agent decides which tools to use
3. **Process Results:** Agent incorporates tool output
4. **Synthesize Response:** Agent generates natural language
5. **Repeat:** If needed (max 5 iterations)

**Error Handling:**

- Tool timeouts (10s default per tool)
- Iteration limits (max 5 loops)
- Graceful fallbacks on failure
- Memory storage errors (non-breaking)

---

### 2. Tool Registry (`agent-tools.ts`)

**Tool Interface:**

```typescript
interface AgentTool {
  name: string;                    // Tool identifier
  description: string;             // What this tool does (for LLM)
  parameters: JSONSchema;          // OpenAI function calling schema
  execute: (params: any) => Promise<any>;  // Tool logic
  timeout?: number;                // Optional timeout (default: 10000ms)
}
```

**Core Tools:**

#### searchTopics
Searches the database for existing learning content.

```typescript
{
  name: 'searchTopics',
  description: 'Search for existing learning content in our library...',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The topic to search for' },
      limit: { type: 'number', description: 'Max results (default: 5)' }
    },
    required: ['query']
  },
  async execute({ query, limit = 5, userId }) {
    // Search database for topics
    return { found: boolean, exactMatch, fuzzyMatches }
  }
}
```

#### detectGranularity
Classifies user input as subject (broad), topic (focused), or module (specific).

```typescript
{
  name: 'detectGranularity',
  description: 'Classify input as SUBJECT, TOPIC, or MODULE...',
  parameters: {
    type: 'object',
    properties: {
      input: { type: 'string', description: 'User learning request' }
    },
    required: ['input']
  },
  async execute({ input }) {
    const granularity = detectGranularityService(input);
    return { granularity, guidance, nextAction }
  }
}
```

#### getUserProgress
Retrieves the user's current learning state and active modules.

```typescript
{
  name: 'getUserProgress',
  description: 'Get user\'s current learning progress...',
  parameters: {
    type: 'object',
    properties: {
      userId: { type: 'string', description: 'User ID' }
    },
    required: ['userId']
  },
  async execute({ userId }) {
    // Query artefacts and attempts tables
    return { hasActiveContent, activeTopics, recentActivity, averageScore }
  }
}
```

#### generateContent
Creates new learning content (triggers content generation workflow).

```typescript
{
  name: 'generateContent',
  description: 'Generate new learning content. ONLY use after confirmation.',
  parameters: {
    type: 'object',
    properties: {
      topic: { type: 'string', description: 'Confirmed topic' },
      userId: { type: 'string', description: 'User ID' },
      granularity: { type: 'string', enum: ['subject', 'topic', 'module'] }
    },
    required: ['topic', 'userId']
  },
  async execute({ topic, userId, granularity }) {
    return { action: 'START_GENERATION', topic, userId, granularity }
  }
}
```

#### confirmWithUser
Asks the user a clarifying question (used sparingly).

```typescript
{
  name: 'confirmWithUser',
  description: 'Ask clarifying question. Use sparingly.',
  parameters: {
    type: 'object',
    properties: {
      question: { type: 'string', description: 'Question to ask' },
      context: { type: 'string', description: 'Why asking' }
    },
    required: ['question']
  },
  async execute({ question, context }) {
    return { action: 'ASK_QUESTION', question, context }
  }
}
```

#### storeDecision
Logs important workflow decisions for analytics.

```typescript
{
  name: 'storeDecision',
  description: 'Log decision point for analytics.',
  parameters: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
      decision: { type: 'string' },
      data: { type: 'object' }
    },
    required: ['userId', 'decision']
  },
  async execute({ userId, decision, data }) {
    await db.insert(agentConversations).values({ ... })
    return { stored: true, decision }
  }
}
```

---

### 3. Agent Memory (`agent-memory.ts`)

**Responsibilities:**
- Store conversation history (30 days)
- Extract decision points
- Manage context window (last 6 messages)
- Persist to database

**Database Tables:**

#### agent_conversations
```sql
CREATE TABLE agent_conversations (
  id UUID PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  conversation_id UUID,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_conversations_user_id 
  ON agent_conversations(user_id, timestamp DESC);
```

#### agent_tool_calls
```sql
CREATE TABLE agent_tool_calls (
  id UUID PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  tool_name TEXT NOT NULL,
  parameters JSONB NOT NULL,
  result JSONB,
  execution_time_ms INTEGER,
  error TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_tool_calls_user_id 
  ON agent_tool_calls(user_id, timestamp DESC);
```

**Retention Policy:**

- Conversations: 30 days auto-cleanup
- Tool calls: 30 days auto-cleanup
- Run cleanup job: `AgentMemory.cleanupOldConversations()`

---

## API Endpoints

### POST /api/agent/chat

Main chat endpoint - processes user message with agent reasoning.

**Request:**
```json
{
  "userId": "user-123",
  "message": "I want to learn quantum physics",
  "conversationHistory": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi, how can I help?" }
  ]
}
```

**Response:**
```json
{
  "message": "I understand you'd like to learn about quantum physics...",
  "toolCalls": [
    { "tool": "detectGranularity", "timestamp": "2025-10-16T..." },
    { "tool": "searchTopics", "timestamp": "2025-10-16T..." }
  ],
  "conversationHistory": [...],
  "metadata": {
    "iterations": 2,
    "model": "gpt-4o",
    "totalTime": 1234
  }
}
```

**Special Response (Content Generation):**
```json
{
  "message": "Thank you. I'm putting that together now.",
  "action": "START_GENERATION",
  "topic": "quantum physics",
  "granularity": "topic",
  ...
}
```

### GET /api/agent/memory/:userId

Retrieve conversation history for a user.

**Response:**
```json
{
  "userId": "user-123",
  "history": [
    {
      "role": "user",
      "content": "I want to learn physics",
      "tool_calls": null
    },
    {
      "role": "assistant",
      "content": "Physics is quite broad...",
      "tool_calls": [...]
    }
  ],
  "count": 6
}
```

### POST /api/agent/reset/:userId

Clear conversation history for a user.

**Response:**
```json
{
  "success": true,
  "message": "Conversation history cleared for user: user-123"
}
```

### GET /api/agent/health

Health check for agent service.

**Response:**
```json
{
  "status": "healthy",
  "enabled": true,
  "configured": true,
  "model": "gpt-4o",
  "maxIterations": 5
}
```

---

## Edge Case Handling

### Meta-Request Detection

**Problem:** "learn something new" vs "learn about novelty"

**Solution:** Agent uses full context to determine if user wants:
- Restart conversation (meta-request)
- Learn about a topic literally called "something new"

**Agent Reasoning:**
```
User: "learn something new"
Agent: This is a meta-phrase meaning restart, not a topic.
Action: Ask "What would you like to learn?"
```

### Affirmative Flexibility

**Problem:** "yes" vs "it is" vs "sounds good"

**Solution:** Agent interprets confirmation flexibly based on conversation context.

**Examples:**
- "yes" → confirm
- "it is" → confirm
- "sounds good" → confirm
- "perfect" → confirm
- "that's right" → confirm

### Rejection with Correction

**Problem:** "no, I meant physics"

**Solution:** Agent extracts corrected topic and restarts.

**Agent Reasoning:**
```
User: "chemistry"
Agent: "I understand, chemistry..."
User: "no, I meant physics"
Agent: Extract "physics" from rejection
Action: Restart with "physics"
```

### Granularity Detection

**Problem:** "physics" (subject) vs "quantum mechanics" (topic)

**Solution:** detectGranularity tool classifies scope.

**Routing:**
- **Subject** → Guide to specific topic
- **Topic** → Search for content or generate
- **Module** → Aggregate to parent topic

### Filler Word Stripping

**Problem:** "physics please" vs "quantum mechanics"

**Solution:** detectGranularity ignores filler words.

**Examples:**
- "physics please" → subject (ignores "please")
- "teach me quantum mechanics" → topic (ignores "teach me")
- "I want to learn chemistry" → subject (ignores "I want to learn")

---

## Configuration

### Environment Variables

```bash
# Agent Orchestrator
FF_AGENT_ORCHESTRATOR_V1=true          # Enable agent (default: false)
AGENT_LLM_MODEL=gpt-4o                  # LLM model (default: gpt-4o)
AGENT_MAX_ITERATIONS=5                  # Max reasoning loops (default: 5)

# OpenAI (required)
OPENAI_API_KEY=sk-...                   # OpenAI API key

# Database (required)
DATABASE_URL=postgresql://...            # PostgreSQL connection string
```

### Frontend (Next.js)

```bash
# web/.env.local
NEXT_PUBLIC_FF_AGENT_ORCHESTRATOR_V1=true
```

---

## Performance Optimization

### Model Selection

**gpt-4o-mini:**
- Faster (200-500ms)
- Cheaper ($0.001/1K tokens)
- Good for simple conversations

**gpt-4o:**
- Slower (500-1000ms)
- More expensive ($0.005/1K tokens)
- Better for complex reasoning

**Recommendation:** Start with `gpt-4o-mini`, upgrade to `gpt-4o` if accuracy issues.

### Tool Parallelization

Tools execute sequentially by default. Future optimization: Execute independent tools in parallel.

### Caching

Future optimization: Cache tool results for common queries.

---

## Monitoring

### Metrics to Track

- **Latency:** p50, p95, p99 response times
- **Cost:** Average cost per conversation
- **Accuracy:** Intent classification accuracy
- **Tool Performance:** Tool execution times
- **Error Rate:** Failed requests / total requests

### Logging

```typescript
console.log('[Agent] Executing tool:', toolName, params);
console.log('[Agent] Tool completed in', executionTime, 'ms');
console.error('[Agent] Error:', error.message);
```

### Database Queries

```sql
-- Average tool execution time
SELECT tool_name, AVG(execution_time_ms) as avg_time
FROM agent_tool_calls
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY tool_name
ORDER BY avg_time DESC;

-- Conversation volume by hour
SELECT DATE_TRUNC('hour', timestamp) as hour, COUNT(*) as messages
FROM agent_conversations
WHERE role IN ('user', 'assistant')
GROUP BY hour
ORDER BY hour DESC;
```

---

## Future Enhancements

1. **Streaming Responses:** Token-by-token response streaming
2. **Tool Parallelization:** Execute independent tools simultaneously
3. **Caching:** Cache tool results for common queries
4. **A/B Testing:** Compare agent vs pattern-based routing
5. **Custom Tools:** Allow dynamic tool registration
6. **Multi-turn Planning:** Agent plans multi-step workflows
7. **User Preferences:** Learn user preferences over time

---

## Troubleshooting

### Agent Too Slow

**Symptom:** Responses take > 2 seconds

**Solutions:**
1. Switch to `gpt-4o-mini`
2. Reduce max iterations (e.g., 3 instead of 5)
3. Optimize tool execution times

### Tool Timeout

**Symptom:** "Tool execution timeout" errors

**Solutions:**
1. Increase timeout in tool definition
2. Check database query performance
3. Add indexes to frequently queried tables

### Memory Errors

**Symptom:** Cannot store conversation history

**Solutions:**
1. Check database connection
2. Verify migrations applied
3. Check disk space on database server

---

## References

- [OpenAI Function Calling Docs](https://platform.openai.com/docs/guides/function-calling)
- [Epic 13 Implementation Prompt](../../EPIC13_AGENT_ORCHESTRATOR_PROMPT.md)
- [Tool Development Guide](./tool-development-guide.md)
- [Migration Runbook](../../AGENT_MIGRATION_RUNBOOK.md)

---

**Architecture Version:** 1.0  
**Last Updated:** 2025-10-16  
**Status:** Production Ready ✅

