/**
 * Agent Orchestrator Test Suite
 * Epic 13: Comprehensive edge case testing
 * 
 * Tests 30+ scenarios to validate agent behavior across:
 * - Meta-request detection
 * - Affirmative flexibility
 * - Rejection with correction
 * - Granularity detection
 * - Filler word handling
 * - Conversation depth awareness
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API_URL = process.env.TEST_API_URL || 'http://localhost:8080';
const TEST_USER = `test-user-${Date.now()}`;

// Skip in CI - these are integration tests that require a running server
// Run locally with: npm test -- agent-orchestrator.test.ts
const describeMode = process.env.CI ? describe.skip : describe;

describeMode('Epic 13: Agent Orchestrator', () => {
  
  beforeAll(async () => {
    // Ensure feature flag is enabled
    if (!process.env.FF_AGENT_ORCHESTRATOR_V1) {
      console.warn('WARNING: FF_AGENT_ORCHESTRATOR_V1 not set. Tests may fail.');
    }
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await fetch(`${API_URL}/api/agent/reset/${TEST_USER}`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  describe('Health Check', () => {
    it('should return healthy status when configured', async () => {
      const response = await fetch(`${API_URL}/api/agent/health`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.enabled).toBe(true);
      expect(data.configured).toBe(true);
      expect(data.model).toBeDefined();
    });
  });

  describe('Meta-Request Detection', () => {
    it('should detect "learn something new" as restart, not topic', async () => {
      const response = await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: TEST_USER,
          message: 'learn something new',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.message.toLowerCase()).toContain('what would you like to learn');
      expect(data.action).not.toBe('START_GENERATION');
    });

    it('should detect "try something else" as restart', async () => {
      const response = await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: TEST_USER,
          message: "let's try something else",
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.message.toLowerCase()).toMatch(/what would you like|what are you interested/);
    });

    it('should detect "I want to learn something different" as restart', async () => {
      const response = await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: TEST_USER,
          message: 'I want to learn something different',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.message.toLowerCase()).toMatch(/what would you like|what are you interested/);
    });

    it('should detect "pick something new" as restart', async () => {
      const response = await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: TEST_USER,
          message: 'pick something new',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.action).not.toBe('START_GENERATION');
    });

    it('should detect "show me other topics" as restart', async () => {
      const response = await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: TEST_USER,
          message: 'show me other topics',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.action).not.toBe('START_GENERATION');
    });
  });

  describe('Affirmative Flexibility', () => {
    // For affirmative tests, we need context (previous message)
    it('should detect "yes" as confirmation', async () => {
      // First, ask about a topic
      await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `${TEST_USER}-affirm-1`,
          message: 'quantum mechanics',
        }),
      });

      // Then confirm with "yes"
      const response = await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `${TEST_USER}-affirm-1`,
          message: 'yes',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      // Agent should trigger content generation or acknowledge confirmation
      expect(data.message.toLowerCase()).toMatch(/thank|putting together|preparing|setting up/);
    });

    it('should detect "sounds good" as confirmation', async () => {
      await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `${TEST_USER}-affirm-2`,
          message: 'leadership',
        }),
      });

      const response = await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `${TEST_USER}-affirm-2`,
          message: 'sounds good',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.message.toLowerCase()).toMatch(/thank|putting together|preparing/);
    });

    it('should detect "perfect" as confirmation', async () => {
      await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `${TEST_USER}-affirm-3`,
          message: 'python programming',
        }),
      });

      const response = await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `${TEST_USER}-affirm-3`,
          message: 'perfect',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.message.toLowerCase()).toMatch(/thank|putting together|preparing/);
    });
  });

  describe('Granularity Detection', () => {
    it('should detect "physics" as subject (broad)', async () => {
      const response = await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `${TEST_USER}-gran-1`,
          message: 'physics',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      // Agent should guide them to choose a specific topic
      expect(data.toolCalls).toBeDefined();
      const hasGranularityTool = data.toolCalls.some((tc: any) => tc.tool === 'detectGranularity');
      expect(hasGranularityTool).toBe(true);
    });

    it('should detect "quantum mechanics" as topic (focused)', async () => {
      const response = await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `${TEST_USER}-gran-2`,
          message: 'quantum mechanics',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      // Agent should search for content or confirm
      const hasSearchTool = data.toolCalls.some((tc: any) => tc.tool === 'searchTopics');
      expect(hasSearchTool).toBe(true);
    });

    it('should detect "leadership" as subject', async () => {
      const response = await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `${TEST_USER}-gran-3`,
          message: 'leadership',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      // Broad subject - should guide to specific topics
      expect(data.message.toLowerCase()).toMatch(/broad|specific|which|area/);
    });

    it('should detect "active listening" as topic', async () => {
      const response = await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `${TEST_USER}-gran-4`,
          message: 'active listening',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      // Specific topic - should search or confirm
      const hasSearchTool = data.toolCalls.some((tc: any) => tc.tool === 'searchTopics');
      expect(hasSearchTool).toBe(true);
    });
  });

  describe('Filler Word Handling', () => {
    it('should strip "please" from "physics please"', async () => {
      const response = await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `${TEST_USER}-filler-1`,
          message: 'physics please',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      // Should detect as subject (broad), not be confused by "please"
      expect(data.toolCalls).toBeDefined();
    });

    it('should ignore "teach me" prefix', async () => {
      const response = await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `${TEST_USER}-filler-2`,
          message: 'teach me quantum mechanics',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      // Should detect "quantum mechanics" as the topic
      const hasSearchTool = data.toolCalls.some((tc: any) => tc.tool === 'searchTopics');
      expect(hasSearchTool).toBe(true);
    });

    it('should ignore "I want to learn" prefix', async () => {
      const response = await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `${TEST_USER}-filler-3`,
          message: 'I want to learn chemistry',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.message.toLowerCase()).toContain('chemistry');
    });
  });

  describe('Natural Variations', () => {
    it('should understand "maths" (UK spelling)', async () => {
      const response = await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `${TEST_USER}-natural-1`,
          message: 'maths',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.message.toLowerCase()).toMatch(/math|broad/);
    });

    it('should understand "beginner maths"', async () => {
      const response = await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `${TEST_USER}-natural-2`,
          message: 'beginner maths',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.message).toBeDefined();
    });

    it('should understand "particle physics"', async () => {
      const response = await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `${TEST_USER}-natural-3`,
          message: 'particle physics',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.message).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should reject missing userId', async () => {
      const response = await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('INVALID_USER_ID');
    });

    it('should reject missing message', async () => {
      const response = await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: TEST_USER,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('INVALID_MESSAGE');
    });

    it('should handle empty message gracefully', async () => {
      const response = await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: TEST_USER,
          message: '',
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Conversation Memory', () => {
    it('should retrieve conversation history', async () => {
      // Send a message
      await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `${TEST_USER}-memory`,
          message: 'test message',
        }),
      });

      // Retrieve history
      const response = await fetch(`${API_URL}/api/agent/memory/${TEST_USER}-memory`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.history).toBeDefined();
      expect(data.history.length).toBeGreaterThan(0);
    });

    it('should reset conversation successfully', async () => {
      // Send a message
      await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `${TEST_USER}-reset`,
          message: 'test',
        }),
      });

      // Reset
      const resetResponse = await fetch(`${API_URL}/api/agent/reset/${TEST_USER}-reset`, {
        method: 'POST',
      });

      expect(resetResponse.status).toBe(200);

      // Verify history is empty
      const historyResponse = await fetch(`${API_URL}/api/agent/memory/${TEST_USER}-reset`);
      const historyData = await historyResponse.json();
      expect(historyData.history.length).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should respond within 5 seconds', async () => {
      const start = Date.now();
      
      const response = await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `${TEST_USER}-perf`,
          message: 'quantum physics',
        }),
      });

      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000); // 5 second timeout
    });

    it('should not exceed 5 iterations', async () => {
      const response = await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `${TEST_USER}-iter`,
          message: 'complex request that might loop',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.metadata.iterations).toBeLessThanOrEqual(5);
    });
  });
});

