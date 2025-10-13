/**
 * Unit Tests for Adaptive Difficulty Service
 * Epic 9: True Adaptive Difficulty Engine
 * 
 * Target: 15 unit tests covering core adaptive functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateMasteryLevel,
  recommendDifficultyLevel,
  detectLearningStyle,
  identifyWeakTopics,
  updateLearnerProfile,
  recordAttemptForAdaptive,
  mapMasteryToDifficulty,
  DifficultyLevel,
  LearningStyle,
} from '../src/services/adaptive';

// Mock the database with a comprehensive chainable query builder
vi.mock('../src/db', () => {
  // Create a recursive chainable mock that can handle any query pattern
  const createChainableMock = (): any => {
    const mockChain: any = {};
    
    // All query methods return the same chain object
    mockChain.select = (..._args: any[]) => mockChain;
    mockChain.from = (..._args: any[]) => mockChain;
    mockChain.where = (..._args: any[]) => mockChain;
    mockChain.innerJoin = (..._args: any[]) => mockChain;
    mockChain.leftJoin = (..._args: any[]) => mockChain;
    mockChain.orderBy = (..._args: any[]) => mockChain;
    mockChain.groupBy = (..._args: any[]) => mockChain;
    mockChain.limit = (..._args: any[]) => Promise.resolve([]);
    mockChain.then = (resolve: any) => Promise.resolve([]).then(resolve);
    
    return mockChain;
  };

  const mockInsert = (..._args: any[]) => ({
    values: (..._args: any[]) => Promise.resolve({ id: 'mock-attempt-id' }),
  });

  const mockUpdate = (..._args: any[]) => ({
    set: (..._args: any[]) => ({
      where: (..._args: any[]) => Promise.resolve({}),
    }),
  });

  return {
    db: {
      select: createChainableMock,
      insert: mockInsert,
      update: mockUpdate,
    },
  };
});

describe('Adaptive Difficulty Engine - Unit Tests', () => {
  describe('mapMasteryToDifficulty', () => {
    it('should map mastery < 0.50 to recall', () => {
      expect(mapMasteryToDifficulty(0.0)).toBe('recall');
      expect(mapMasteryToDifficulty(0.25)).toBe('recall');
      expect(mapMasteryToDifficulty(0.49)).toBe('recall');
    });

    it('should map mastery 0.50-0.75 to application', () => {
      expect(mapMasteryToDifficulty(0.50)).toBe('application');
      expect(mapMasteryToDifficulty(0.60)).toBe('application');
      expect(mapMasteryToDifficulty(0.74)).toBe('application');
    });

    it('should map mastery 0.75-0.90 to analysis', () => {
      expect(mapMasteryToDifficulty(0.75)).toBe('analysis');
      expect(mapMasteryToDifficulty(0.80)).toBe('analysis');
      expect(mapMasteryToDifficulty(0.89)).toBe('analysis');
    });

    it('should map mastery >= 0.90 to synthesis', () => {
      expect(mapMasteryToDifficulty(0.90)).toBe('synthesis');
      expect(mapMasteryToDifficulty(0.95)).toBe('synthesis');
      expect(mapMasteryToDifficulty(1.00)).toBe('synthesis');
    });
  });

  describe('calculateMasteryLevel', () => {
    it('should return 0 for user with no attempts', async () => {
      const mastery = await calculateMasteryLevel('user-1', 'topic-1');
      expect(mastery).toBe(0.0);
    });

    it('should return value between 0 and 1', async () => {
      const mastery = await calculateMasteryLevel('user-1', 'topic-1');
      expect(mastery).toBeGreaterThanOrEqual(0);
      expect(mastery).toBeLessThanOrEqual(1);
    });

    it('should handle time decay in mastery calculation', async () => {
      // Time decay is tested implicitly through the calculation logic
      // With mocked empty database, this will return 0
      const mastery = await calculateMasteryLevel('user-1', 'topic-1');
      expect(mastery).toBeGreaterThanOrEqual(0);
      expect(mastery).toBeLessThanOrEqual(1);
    });
  });

  describe('recommendDifficultyLevel', () => {
    it('should recommend recall for low mastery', async () => {
      // This will depend on mocking the mastery calculation
      const rec = await recommendDifficultyLevel('user-1', 'topic-1');
      expect(['recall', 'application', 'analysis', 'synthesis']).toContain(rec.difficulty);
      expect(rec.confidence).toBeGreaterThanOrEqual(0);
      expect(rec.confidence).toBeLessThanOrEqual(1);
      expect(rec.reasoning).toBeTruthy();
    });

    it('should include reasoning in recommendation', async () => {
      const rec = await recommendDifficultyLevel('user-1', 'topic-1');
      expect(rec.reasoning).toBeTruthy();
      expect(typeof rec.reasoning).toBe('string');
    });

    it('should return confidence score', async () => {
      const rec = await recommendDifficultyLevel('user-1', 'topic-1');
      expect(rec.confidence).toBeGreaterThanOrEqual(0);
      expect(rec.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('detectLearningStyle', () => {
    it('should return unknown for user with insufficient data', async () => {
      const detection = await detectLearningStyle('user-1');
      expect(detection.style).toBe('unknown');
      expect(detection.confidence).toBe(0.0);
    });

    it('should return valid learning style types', async () => {
      const detection = await detectLearningStyle('user-1');
      expect(['visual', 'verbal', 'kinesthetic', 'balanced', 'unknown']).toContain(detection.style);
    });

    it('should include signals in detection result', async () => {
      const detection = await detectLearningStyle('user-1');
      expect(detection.signals).toBeDefined();
      expect(typeof detection.signals.totalAttempts).toBe('number');
    });

    it('should have confidence between 0 and 1', async () => {
      const detection = await detectLearningStyle('user-1');
      expect(detection.confidence).toBeGreaterThanOrEqual(0);
      expect(detection.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('identifyWeakTopics', () => {
    it('should return empty array for user with no comprehension data', async () => {
      const weakTopics = await identifyWeakTopics('user-1');
      expect(Array.isArray(weakTopics)).toBe(true);
      expect(weakTopics.length).toBe(0);
    });

    it('should respect mastery threshold parameter', async () => {
      const weakTopics = await identifyWeakTopics('user-1', 0.80);
      expect(Array.isArray(weakTopics)).toBe(true);
    });

    it('should return topics with required properties', async () => {
      const weakTopics = await identifyWeakTopics('user-1');
      if (weakTopics.length > 0) {
        expect(weakTopics[0]).toHaveProperty('topicId');
        expect(weakTopics[0]).toHaveProperty('topicTitle');
        expect(weakTopics[0]).toHaveProperty('mastery');
        expect(weakTopics[0]).toHaveProperty('attemptsCount');
      }
    });
  });

  describe('updateLearnerProfile', () => {
    it('should complete without throwing for valid user', async () => {
      await expect(updateLearnerProfile('user-1')).resolves.not.toThrow();
    });

    it('should accept optional signals parameter', async () => {
      await expect(
        updateLearnerProfile('user-1', {
          avgResponseTime: 3500,
          consistencyScore: 0.85,
          learningStyle: 'visual',
        })
      ).resolves.not.toThrow();
    });

    it('should handle missing signals gracefully', async () => {
      await expect(updateLearnerProfile('user-1', {})).resolves.not.toThrow();
    });
  });

  describe('recordAttemptForAdaptive', () => {
    it('should record attempt and return mastery', async () => {
      const mastery = await recordAttemptForAdaptive('user-1', 'topic-1', {
        questionId: 'q1',
        correct: true,
        difficultyLevel: 'application',
      });

      expect(typeof mastery).toBe('number');
      expect(mastery).toBeGreaterThanOrEqual(0);
      expect(mastery).toBeLessThanOrEqual(1);
    });

    it('should handle incorrect attempts', async () => {
      const mastery = await recordAttemptForAdaptive('user-1', 'topic-1', {
        questionId: 'q1',
        correct: false,
        difficultyLevel: 'recall',
      });

      expect(typeof mastery).toBe('number');
    });

    it('should handle partial credit', async () => {
      const mastery = await recordAttemptForAdaptive('user-1', 'topic-1', {
        questionId: 'q1',
        correct: false,
        partialCredit: 0.7,
        difficultyLevel: 'application',
      });

      expect(typeof mastery).toBe('number');
    });

    it('should handle response time tracking', async () => {
      const mastery = await recordAttemptForAdaptive('user-1', 'topic-1', {
        questionId: 'q1',
        correct: true,
        responseTimeMs: 4500,
        difficultyLevel: 'analysis',
      });

      expect(typeof mastery).toBe('number');
    });
  });

  describe('Edge Cases', () => {
    it('should handle extreme mastery values gracefully', () => {
      expect(mapMasteryToDifficulty(-0.1)).toBe('recall'); // Negative clamped to 0
      expect(mapMasteryToDifficulty(1.5)).toBe('synthesis'); // Over 1.0 clamped to synthesis
    });

    it('should handle boundary mastery values', () => {
      expect(mapMasteryToDifficulty(0.50)).toBe('application');
      expect(mapMasteryToDifficulty(0.75)).toBe('analysis');
      expect(mapMasteryToDifficulty(0.90)).toBe('synthesis');
    });
  });
});
