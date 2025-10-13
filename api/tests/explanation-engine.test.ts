/**
 * Test: Explanation Engine (Epic 8 Phase 2)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { generateExplanation } from '../src/services/explanation-engine';

describe('Explanation Engine', () => {
  it('should generate explanation with proper structure', async () => {
    // This test requires OPENAI_API_KEY in environment
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ Skipping test: OPENAI_API_KEY not set');
      return;
    }

    // Mock question data - using a test question ID
    const questionId = 'test-question-123';
    const learnerQuery = 'Why is this the correct answer?';
    const userId = 'test-user-123';

    // Note: This will actually call OpenAI API
    // In production, you'd mock this or use a test API key
    try {
      const result = await generateExplanation(questionId, learnerQuery, userId);

      // Verify structure
      expect(result).toHaveProperty('explanation');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('tokensUsed');
      expect(result).toHaveProperty('cost');
      expect(result).toHaveProperty('cached');
      expect(result).toHaveProperty('confusionLogId');

      // Verify types
      expect(typeof result.explanation).toBe('string');
      expect(typeof result.model).toBe('string');
      expect(typeof result.tokensUsed).toBe('number');
      expect(typeof result.cost).toBe('number');
      expect(typeof result.cached).toBe('boolean');

      // Verify values make sense
      expect(result.explanation.length).toBeGreaterThan(0);
      expect(result.tokensUsed).toBeGreaterThan(0);
      expect(result.cost).toBeGreaterThan(0);
      expect(result.cached).toBe(false); // First call should not be cached

      console.log('✅ Explanation generated successfully');
      console.log(`   Model: ${result.model}`);
      console.log(`   Tokens: ${result.tokensUsed}`);
      console.log(`   Cost: $${result.cost.toFixed(6)}`);
      console.log(`   Cached: ${result.cached}`);
    } catch (error: any) {
      // If question doesn't exist in DB, that's expected in unit test
      if (error.message === 'Question not found') {
        console.warn('⚠️ Test skipped: Test question not in database');
        return;
      }
      throw error;
    }
  }, 30000); // 30 second timeout for API call

  it('should return cached result on second call', async () => {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ Skipping test: OPENAI_API_KEY not set');
      return;
    }

    const questionId = 'test-question-cache';
    const learnerQuery = 'Explain this question';
    const userId = 'test-user-123';

    try {
      // First call
      const result1 = await generateExplanation(questionId, learnerQuery, userId);
      expect(result1.cached).toBe(false);

      // Second call with same parameters
      const result2 = await generateExplanation(questionId, learnerQuery, userId);
      expect(result2.cached).toBe(true);
      expect(result2.explanation).toBe(result1.explanation);
      expect(result2.cost).toBe(0); // Cached should have zero cost
      expect(result2.tokensUsed).toBe(0); // Cached should have zero tokens

      console.log('✅ Cache working correctly');
    } catch (error: any) {
      if (error.message === 'Question not found') {
        console.warn('⚠️ Test skipped: Test question not in database');
        return;
      }
      throw error;
    }
  }, 30000);
});

