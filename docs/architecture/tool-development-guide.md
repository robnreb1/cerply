# Tool Development Guide

**Epic 13: Agent Orchestrator - Adding New Tools**  
**Version:** 1.0  
**Date:** 2025-10-16

---

## Overview

This guide explains how to create new tools for the Agent Orchestrator. Tools are self-contained functions that the agent can call to perform specific actions (e.g., search database, trigger workflows, external API calls).

---

## Tool Interface

Every tool must implement the `AgentTool` interface:

```typescript
interface AgentTool {
  name: string;                    // Unique identifier
  description: string;             // What this tool does (for LLM)
  parameters: JSONSchema;          // OpenAI function calling schema
  execute: (params: any) => Promise<any>;  // Tool logic
  timeout?: number;                // Optional timeout in ms (default: 10000)
}
```

---

## Step-by-Step: Creating a New Tool

### Step 1: Define Tool Structure

Create a new tool in `api/src/services/agent-tools.ts`:

```typescript
export const myNewTool: AgentTool = {
  name: 'myToolName',
  description: 'Clear description of what this tool does. The agent reads this to decide when to use it.',
  parameters: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Description of parameter 1',
      },
      param2: {
        type: 'number',
        description: 'Description of parameter 2 (optional)',
      },
    },
    required: ['param1'],  // Which parameters are required
  },
  async execute({ param1, param2, userId }) {
    // Tool implementation here
  },
  timeout: 5000,  // Optional: custom timeout (default: 10000ms)
};
```

### Step 2: Implement Tool Logic

```typescript
async execute({ param1, param2, userId }) {
  try {
    // 1. Validate inputs
    if (!param1 || param1.length === 0) {
      return { error: 'param1 is required and cannot be empty' };
    }

    // 2. Perform action
    const result = await performSomeAction(param1, param2);

    // 3. Return structured result
    return {
      success: true,
      data: result,
      message: 'Action completed successfully',
    };
  } catch (error: any) {
    console.error('[Tool:myToolName] Error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}
```

### Step 3: Register Tool

Add your tool to the default tools registration:

```typescript
// In api/src/services/agent-tools.ts

export function registerDefaultTools(orchestrator: any): void {
  orchestrator.registerTool(searchTopicsTool);
  orchestrator.registerTool(detectGranularityTool);
  orchestrator.registerTool(getUserProgressTool);
  orchestrator.registerTool(generateContentTool);
  orchestrator.registerTool(confirmWithUserTool);
  orchestrator.registerTool(storeDecisionTool);
  
  // Add your new tool here
  orchestrator.registerTool(myNewTool);
  
  console.log('[AgentTools] Registered 7 tools');  // Update count
}
```

### Step 4: Test Tool

Create a test for your tool:

```typescript
// In api/test/agent-tools.test.ts

describe('myNewTool', () => {
  it('should execute successfully with valid params', async () => {
    const result = await myNewTool.execute({
      param1: 'test value',
      userId: 'test-user-123',
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should return error for invalid params', async () => {
    const result = await myNewTool.execute({
      param1: '',
      userId: 'test-user-123',
    });

    expect(result.error).toBeDefined();
  });
});
```

---

## Example: Creating a "Send Email" Tool

### Full Implementation

```typescript
export const sendEmailTool: AgentTool = {
  name: 'sendEmail',
  description: 'Send an email to the user. Use this when the user explicitly requests email notifications or updates.',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'The user ID to send email to',
      },
      subject: {
        type: 'string',
        description: 'Email subject line',
      },
      body: {
        type: 'string',
        description: 'Email body content (plain text)',
      },
      priority: {
        type: 'string',
        enum: ['low', 'normal', 'high'],
        description: 'Email priority (default: normal)',
      },
    },
    required: ['userId', 'subject', 'body'],
  },
  async execute({ userId, subject, body, priority = 'normal' }) {
    try {
      // 1. Get user email from database
      const user = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user || !user[0]?.email) {
        return {
          success: false,
          error: 'User email not found',
        };
      }

      // 2. Send email via service (e.g., SendGrid, AWS SES)
      await emailService.send({
        to: user[0].email,
        subject,
        body,
        priority,
      });

      // 3. Log email sent
      await db.insert(emailLogs).values({
        userId,
        subject,
        sentAt: new Date(),
      });

      return {
        success: true,
        message: `Email sent to ${user[0].email}`,
        sentAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('[Tool:sendEmail] Error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },
  timeout: 15000,  // Email might take longer
};
```

### How Agent Uses It

```
User: "Can you email me a summary of my progress?"

Agent Reasoning:
1. User explicitly requested email
2. Call getUserProgress(userId) to get progress data
3. Format progress into email body
4. Call sendEmail(userId, subject, body)
5. Respond: "I've sent you an email with your progress summary."
```

---

## Best Practices

### 1. Clear Descriptions

✅ **Good:**
```typescript
description: 'Search for existing learning content in our library by topic name. Use when user mentions a specific topic to check if we have content available.'
```

❌ **Bad:**
```typescript
description: 'Search'  // Too vague
```

### 2. Specific Parameter Descriptions

✅ **Good:**
```typescript
parameters: {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: 'The topic name to search for (e.g., "quantum physics", "leadership")',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of results to return (default: 5)',
    },
  },
  required: ['query'],
}
```

❌ **Bad:**
```typescript
parameters: {
  type: 'object',
  properties: {
    query: { type: 'string' },  // No description
    limit: { type: 'number' },
  },
  required: ['query'],
}
```

### 3. Structured Return Values

✅ **Good:**
```typescript
return {
  success: true,
  data: { topics: [...], count: 5 },
  message: 'Found 5 matching topics',
};
```

❌ **Bad:**
```typescript
return [...];  // Unstructured array
```

### 4. Error Handling

✅ **Good:**
```typescript
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error: any) {
  console.error('[Tool:myTool] Error:', error.message);
  return { success: false, error: error.message };
}
```

❌ **Bad:**
```typescript
const result = await riskyOperation();  // Unhandled errors crash agent
return result;
```

### 5. Timeouts

Set appropriate timeouts based on tool complexity:

```typescript
timeout: 2000,   // Fast operations (e.g., granularity detection)
timeout: 5000,   // Database queries (default)
timeout: 10000,  // Content generation triggers
timeout: 30000,  // External API calls (if needed)
```

---

## Tool Categories

### Information Retrieval Tools

Tools that fetch data from database or external sources.

**Examples:**
- `searchTopics` - Search learning content
- `getUserProgress` - Get user's active learning
- `getWeatherData` - Fetch weather (if needed)

**Pattern:**
```typescript
async execute({ query, userId }) {
  const data = await db.select(...).from(...).where(...);
  return { found: data.length > 0, data };
}
```

### Action Tools

Tools that perform actions or trigger workflows.

**Examples:**
- `generateContent` - Trigger content generation
- `sendEmail` - Send email to user
- `scheduleReminder` - Schedule future action

**Pattern:**
```typescript
async execute({ userId, action }) {
  await performAction(userId, action);
  return { success: true, action: 'ACTION_TRIGGERED' };
}
```

### Classification Tools

Tools that analyze or classify user input.

**Examples:**
- `detectGranularity` - Classify scope level
- `detectSentiment` - Analyze user sentiment
- `detectIntent` - Classify user intent

**Pattern:**
```typescript
async execute({ input }) {
  const classification = classifyInput(input);
  return { classification, confidence: 0.95 };
}
```

### Confirmation Tools

Tools that interact with the user.

**Examples:**
- `confirmWithUser` - Ask clarifying question
- `provideOptions` - Present multiple choices

**Pattern:**
```typescript
async execute({ question, options }) {
  return { action: 'ASK_USER', question, options };
}
```

---

## Advanced: External API Integration

### Example: Weather Tool

```typescript
export const getWeatherTool: AgentTool = {
  name: 'getWeather',
  description: 'Get current weather for a location. Use when user asks about weather conditions.',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'City name or coordinates (e.g., "London", "51.5074,-0.1278")',
      },
      units: {
        type: 'string',
        enum: ['metric', 'imperial'],
        description: 'Temperature units (default: metric)',
      },
    },
    required: ['location'],
  },
  async execute({ location, units = 'metric' }) {
    try {
      // Call external API
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${location}&units=${units}&appid=${process.env.WEATHER_API_KEY}`
      );

      if (!response.ok) {
        return {
          success: false,
          error: 'Failed to fetch weather data',
        };
      }

      const data = await response.json();

      return {
        success: true,
        location: data.name,
        temperature: data.main.temp,
        conditions: data.weather[0].description,
        humidity: data.main.humidity,
      };
    } catch (error: any) {
      console.error('[Tool:getWeather] Error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },
  timeout: 10000,  // External API call
};
```

---

## Testing Tools

### Unit Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { myNewTool } from '../services/agent-tools';

describe('myNewTool', () => {
  describe('Successful Execution', () => {
    it('should execute with valid parameters', async () => {
      const result = await myNewTool.execute({
        param1: 'valid value',
        userId: 'test-user-123',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle optional parameters', async () => {
      const result = await myNewTool.execute({
        param1: 'value',
        param2: 42,  // Optional
        userId: 'test-user-123',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return error for missing required param', async () => {
      const result = await myNewTool.execute({
        userId: 'test-user-123',
        // param1 missing
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should return error for invalid param type', async () => {
      const result = await myNewTool.execute({
        param1: 123,  // Should be string
        userId: 'test-user-123',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should complete within timeout', async () => {
      const start = Date.now();
      
      await myNewTool.execute({
        param1: 'value',
        userId: 'test-user-123',
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(myNewTool.timeout || 10000);
    });
  });
});
```

### Integration Test with Agent

```typescript
describe('Agent Integration: myNewTool', () => {
  it('should call tool when appropriate', async () => {
    const response = await fetch('/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'test-user',
        message: 'trigger my new tool',
      }),
    });

    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.toolCalls).toBeDefined();
    
    const myToolCall = data.toolCalls.find((tc: any) => tc.tool === 'myToolName');
    expect(myToolCall).toBeDefined();
  });
});
```

---

## Debugging Tools

### Enable Tool Logging

```typescript
async execute({ param1, userId }) {
  console.log(`[Tool:myToolName] Executing with:`, { param1, userId });
  
  const result = await performAction(param1);
  
  console.log(`[Tool:myToolName] Result:`, result);
  
  return result;
}
```

### Check Tool Call History

```sql
SELECT tool_name, parameters, result, execution_time_ms, error
FROM agent_tool_calls
WHERE user_id = 'test-user-123'
ORDER BY timestamp DESC
LIMIT 10;
```

### Test Tool Directly

```typescript
// In Node REPL or test file
const { myNewTool } = require('./api/src/services/agent-tools');

const result = await myNewTool.execute({
  param1: 'test',
  userId: 'test-user',
});

console.log(result);
```

---

## Common Pitfalls

### 1. Vague Tool Descriptions

❌ **Problem:** Agent doesn't know when to use tool
```typescript
description: 'Does stuff with topics'
```

✅ **Solution:** Be specific about when to use tool
```typescript
description: 'Search for existing learning content in our library. Use when user mentions a specific topic to see if we have content available.'
```

### 2. No Error Handling

❌ **Problem:** Tool crashes agent on error
```typescript
async execute({ userId }) {
  const data = await db.query(...);  // Unhandled error
  return data;
}
```

✅ **Solution:** Always wrap in try-catch
```typescript
async execute({ userId }) {
  try {
    const data = await db.query(...);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

### 3. Inconsistent Return Types

❌ **Problem:** Agent confused by varying return structures
```typescript
// Sometimes returns array, sometimes object
return [...];  // or
return { data: [...] };
```

✅ **Solution:** Always return same structure
```typescript
return {
  success: boolean,
  data: any,
  message?: string,
  error?: string,
};
```

### 4. Long-Running Operations

❌ **Problem:** Tool blocks agent for too long
```typescript
async execute({ userId }) {
  // Takes 30 seconds
  const result = await longOperation();
  return result;
}
```

✅ **Solution:** Set appropriate timeout or make async
```typescript
async execute({ userId }) {
  // Queue long operation for background processing
  await queueJob({ userId, operation: 'longOperation' });
  return {
    success: true,
    message: 'Operation queued, you\'ll be notified when complete',
  };
},
timeout: 5000,  // Fail fast
```

---

## Tool Versioning

When modifying existing tools:

1. **Backward Compatible Changes:** Update in place
   - Adding optional parameters
   - Improving error messages
   - Performance optimizations

2. **Breaking Changes:** Create new version
   - Changing required parameters
   - Changing return structure
   - Renaming tool

```typescript
// Version 1 (deprecated)
export const searchTopicsTool: AgentTool = { ... };

// Version 2 (new)
export const searchTopicsV2Tool: AgentTool = {
  name: 'searchTopicsV2',
  ...
};
```

---

## Checklist for New Tools

- [ ] Clear, specific tool description
- [ ] Detailed parameter descriptions
- [ ] Required parameters marked
- [ ] Try-catch error handling
- [ ] Structured return value ({ success, data, error })
- [ ] Appropriate timeout set
- [ ] Console logging added
- [ ] Unit tests written (3+ scenarios)
- [ ] Integration test with agent
- [ ] Registered in `registerDefaultTools()`
- [ ] Documentation updated

---

## References

- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [JSON Schema Docs](https://json-schema.org/)
- [Agent Architecture](./agent-orchestrator.md)

---

**Guide Version:** 1.0  
**Last Updated:** 2025-10-16

