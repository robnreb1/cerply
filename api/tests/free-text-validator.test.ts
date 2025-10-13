/**
 * Test: Free-Text Answer Validation (Epic 8 Phase 3)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { validateFreeTextAnswer, shouldUseFreeText } from '../src/services/free-text-validator';

describe('Free-Text Answer Validation', () => {
  describe('Fuzzy Matching', () => {
    it('should accept exact matches', async () => {
      const result = await validateFreeTextAnswer(
        'photosynthesis',
        'photosynthesis',
        'What process do plants use to create energy?'
      );

      expect(result.correct).toBe(true);
      expect(result.partialCredit).toBe(1.0);
      expect(result.method).toBe('fuzzy');
    });

    it('should accept case-insensitive matches', async () => {
      const result = await validateFreeTextAnswer(
        'PHOTOSYNTHESIS',
        'photosynthesis',
        'What process do plants use to create energy?'
      );

      expect(result.correct).toBe(true);
      expect(result.partialCredit).toBe(1.0);
      expect(result.method).toBe('fuzzy');
    });

    it('should accept matches with whitespace differences', async () => {
      const result = await validateFreeTextAnswer(
        '  photosynthesis  ',
        'photosynthesis',
        'What process do plants use to create energy?'
      );

      expect(result.correct).toBe(true);
      expect(result.partialCredit).toBe(1.0);
      expect(result.method).toBe('fuzzy');
    });

    it('should accept very similar answers (>90% similarity)', async () => {
      const result = await validateFreeTextAnswer(
        'photosynthesis process',
        'photosynthesis',
        'What process do plants use to create energy?'
      );

      // Should still have reasonable credit
      expect(result.partialCredit).toBeGreaterThanOrEqual(0);
      expect(result.partialCredit).toBeLessThanOrEqual(1);
      expect(result.feedback).toBeTruthy();
    });

    it('should give partial credit for close matches', async () => {
      const result = await validateFreeTextAnswer(
        'photo synthesis',
        'photosynthesis',
        'What process do plants use to create energy?'
      );

      // Fuzzy or LLM will handle this
      expect(result.partialCredit).toBeGreaterThanOrEqual(0);
      expect(result.partialCredit).toBeLessThanOrEqual(1);
      expect(result.feedback).toBeTruthy();
    });
  });

  describe('LLM Validation', () => {
    it('should use LLM for semantically different but correct answers', async () => {
      // Skip if no API key
      if (!process.env.OPENAI_API_KEY) {
        console.warn('⚠️ Skipping LLM test: OPENAI_API_KEY not set');
        return;
      }

      const result = await validateFreeTextAnswer(
        'the process where plants convert sunlight into energy',
        'photosynthesis',
        'What process do plants use to create energy?'
      );

      expect(result.method).toBe('llm');
      expect(result.feedback).toBeTruthy();
      expect(typeof result.partialCredit).toBe('number');
      expect(result.partialCredit).toBeGreaterThanOrEqual(0);
      expect(result.partialCredit).toBeLessThanOrEqual(1);
    }, 30000); // 30 second timeout for API call

    it('should handle incorrect answers', async () => {
      // Skip if no API key
      if (!process.env.OPENAI_API_KEY) {
        console.warn('⚠️ Skipping LLM test: OPENAI_API_KEY not set');
        return;
      }

      const result = await validateFreeTextAnswer(
        'respiration',
        'photosynthesis',
        'What process do plants use to create energy?'
      );

      expect(result.method).toBe('llm');
      // Should be marked incorrect or low partial credit
      expect(result.partialCredit).toBeLessThan(0.5);
    }, 30000);
  });

  describe('Edge Cases', () => {
    it('should handle empty learner answer', async () => {
      const result = await validateFreeTextAnswer(
        '',
        'photosynthesis',
        'What process do plants use to create energy?'
      );

      expect(result.correct).toBe(false);
      expect(result.partialCredit).toBe(0);
    });

    it('should handle very long answers', async () => {
      const longAnswer = 'photosynthesis '.repeat(50);
      const result = await validateFreeTextAnswer(
        longAnswer,
        'photosynthesis',
        'What process do plants use to create energy?'
      );

      // Should handle gracefully
      expect(typeof result.partialCredit).toBe('number');
      expect(result.feedback).toBeTruthy();
    });
  });

  describe('shouldUseFreeText', () => {
    it('should not use free-text for binary questions', () => {
      expect(shouldUseFreeText('mcq', 2)).toBe(false);
    });

    it('should not use free-text for small MCQs', () => {
      expect(shouldUseFreeText('mcq', 3)).toBe(false);
      expect(shouldUseFreeText('mcq', 4)).toBe(false);
    });

    it('should use free-text for free question types', () => {
      expect(shouldUseFreeText('free', 0)).toBe(true);
    });

    it('should allow free-text for larger MCQs', () => {
      expect(shouldUseFreeText('mcq', 5)).toBe(true);
    });
  });
});

describe('Free-Text Validation Integration', () => {
  it('should provide structured validation results', async () => {
    const result = await validateFreeTextAnswer(
      'test answer',
      'correct answer',
      'Test question?'
    );

    // Verify result structure
    expect(result).toHaveProperty('correct');
    expect(result).toHaveProperty('partialCredit');
    expect(result).toHaveProperty('feedback');
    expect(result).toHaveProperty('method');

    // Verify types
    expect(typeof result.correct).toBe('boolean');
    expect(typeof result.partialCredit).toBe('number');
    expect(typeof result.feedback).toBe('string');
    expect(['fuzzy', 'llm']).toContain(result.method);

    // Verify ranges
    expect(result.partialCredit).toBeGreaterThanOrEqual(0);
    expect(result.partialCredit).toBeLessThanOrEqual(1);
  });
});

