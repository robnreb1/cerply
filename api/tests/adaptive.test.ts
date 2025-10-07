/**
 * Adaptive Behavior Tests
 * 
 * Verifies adaptive learning algorithms work correctly.
 * Tests difficulty adjustment, auto-assessment, and spaced repetition.
 */

import { describe, test, expect, beforeEach, beforeAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { build } from '../src/app';

describe('Adaptive Behavior Tests', () => {
  let app: FastifyInstance;
  
  beforeAll(() => {
    // Enable certified retention endpoints for tests
    process.env.CERTIFIED_ENABLED = 'true';
    process.env.RETENTION_ENABLED = 'true';
  });
  
  beforeEach(async () => {
    app = await build();
    await app.ready();
  });

  test('difficulty adjusts based on performance', async () => {
    const sessionId = 'test-session-1';
    
    // Start with medium difficulty
    const scheduleResponse = await app.inject({
      method: 'POST',
      url: '/api/certified/schedule',
      payload: {
        session_id: sessionId,
        plan_id: 'test-plan',
        items: [
          { id: 'item-1', difficulty: 'medium' },
          { id: 'item-2', difficulty: 'medium' },
          { id: 'item-3', difficulty: 'medium' }
        ]
      }
    });

    expect(scheduleResponse.statusCode).toBe(200);
    const scheduleBody = JSON.parse(scheduleResponse.body);
    expect(scheduleBody.order).toContain('item-1');

    // Simulate poor performance (wrong answer, slow response)
    const scoreResponse1 = await app.inject({
      method: 'POST',
      url: '/api/score',
      payload: {
        item_id: 'item-1',
        user_answer: 'wrong answer',
        expected_answer: 'correct answer',
        latency_ms: 35000,
        hint_count: 2,
        retry_count: 1
      }
    });

    expect(scoreResponse1.statusCode).toBe(200);
    const scoreBody1 = JSON.parse(scoreResponse1.body);
    expect(scoreBody1.correct).toBe(false);
    expect(scoreBody1.difficulty).toBe('hard');

    // Simulate good performance (correct answer, fast response)
    const scoreResponse2 = await app.inject({
      method: 'POST',
      url: '/api/score',
      payload: {
        item_id: 'item-2',
        user_answer: 'correct answer',
        expected_answer: 'correct answer',
        latency_ms: 5000,
        hint_count: 0,
        retry_count: 0
      }
    });

    expect(scoreResponse2.statusCode).toBe(200);
    const scoreBody2 = JSON.parse(scoreResponse2.body);
    expect(scoreBody2.correct).toBe(true);
    expect(scoreBody2.difficulty).toBe('easy');

    // Post progress to update learner state
    const progressResponse = await app.inject({
      method: 'POST',
      url: '/api/certified/progress',
      payload: {
        session_id: sessionId,
        card_id: 'item-1',
        action: 'grade',
        grade: 1,
        at: new Date().toISOString()
      }
    });

    expect(progressResponse.statusCode).toBe(200);
  });

  test('auto-assessment works without manual grading', async () => {
    const testCases = [
      {
        user_answer: 'correct answer',
        expected_answer: 'correct answer',
        latency_ms: 5000,
        hint_count: 0,
        description: 'correct and fast'
      },
      {
        user_answer: 'wrong answer',
        expected_answer: 'correct answer',
        latency_ms: 30000,
        hint_count: 2,
        description: 'wrong and slow'
      },
      {
        user_answer: 'partially correct',
        expected_answer: 'correct answer',
        latency_ms: 15000,
        hint_count: 1,
        description: 'partially correct and medium speed'
      }
    ];

    for (const testCase of testCases) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/score',
        payload: {
          item_id: 'test-item',
          user_answer: testCase.user_answer,
          expected_answer: testCase.expected_answer,
          latency_ms: testCase.latency_ms,
          hint_count: testCase.hint_count
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      // Auto-assessment should determine correctness
      expect(body).toHaveProperty('correct');
      expect(typeof body.correct).toBe('boolean');
      
      // Should determine difficulty based on performance
      expect(body).toHaveProperty('difficulty');
      expect(['easy', 'medium', 'hard']).toContain(body.difficulty);
      
      // Should provide explanation when needed
      if (!body.correct || testCase.latency_ms > 20000) {
        expect(body.explain).toBeTruthy();
        expect(body.explain.length).toBeGreaterThan(10);
      }
      
      // Should provide diagnostics
      expect(body.diagnostics).toBeDefined();
      expect(body.diagnostics.confidence).toBeDefined();
    }
  });

  test('spaced repetition considers struggle and recency', async () => {
    const sessionId = 'spaced-rep-session';
    
    // Schedule initial items
    const scheduleResponse = await app.inject({
      method: 'POST',
      url: '/api/certified/schedule',
      payload: {
        session_id: sessionId,
        plan_id: 'spaced-plan',
        items: [
          { id: 'item-1', difficulty: 'easy' },
          { id: 'item-2', difficulty: 'medium' },
          { id: 'item-3', difficulty: 'hard' }
        ]
      }
    });

    expect(scheduleResponse.statusCode).toBe(200);

    // Simulate struggling with item-1 (wrong answers, slow responses)
    await app.inject({
      method: 'POST',
      url: '/api/certified/progress',
      payload: {
        session_id: sessionId,
        card_id: 'item-1',
        action: 'grade',
        grade: 1, // Poor grade
        at: new Date().toISOString()
      }
    });

    // Simulate good performance on item-2
    await app.inject({
      method: 'POST',
      url: '/api/certified/progress',
      payload: {
        session_id: sessionId,
        card_id: 'item-2',
        action: 'grade',
        grade: 5, // Good grade
        at: new Date().toISOString()
      }
    });

    // Get next item - should prioritize struggling items
    const nextResponse = await app.inject({
      method: 'GET',
      url: '/api/daily/next'
    });

    expect(nextResponse.statusCode).toBe(200);
    const nextBody = JSON.parse(nextResponse.body);
    
    // Should return an item (prioritizing struggling ones)
    expect(nextBody).toHaveProperty('item_id');
    expect(['item-1', 'item-2', 'item-3']).toContain(nextBody.item_id);
  });

  test('learner state tracks performance patterns', async () => {
    const sessionId = 'state-tracking-session';
    
    // Schedule items
    await app.inject({
      method: 'POST',
      url: '/api/certified/schedule',
      payload: {
        session_id: sessionId,
        plan_id: 'state-plan',
        items: [
          { id: 'item-1', difficulty: 'medium' },
          { id: 'item-2', difficulty: 'medium' }
        ]
      }
    });

    // Track multiple attempts on item-1
    const attempts = [
      { grade: 1, latency: 30000 }, // Poor
      { grade: 2, latency: 25000 }, // Still poor
      { grade: 4, latency: 15000 }, // Better
      { grade: 5, latency: 8000 }   // Good
    ];

    for (const attempt of attempts) {
      await app.inject({
        method: 'POST',
        url: '/api/certified/progress',
        payload: {
          session_id: sessionId,
          card_id: 'item-1',
          action: 'grade',
          grade: attempt.grade,
          at: new Date().toISOString()
        }
      });

      // Simulate scoring
      await app.inject({
        method: 'POST',
        url: '/api/score',
        payload: {
          item_id: 'item-1',
          user_answer: attempt.grade > 3 ? 'correct' : 'incorrect',
          expected_answer: 'correct',
          latency_ms: attempt.latency,
          hint_count: attempt.grade < 3 ? 1 : 0
        }
      });
    }

    // Check that learner state is being tracked
    const progressResponse = await app.inject({
      method: 'GET',
      url: `/api/certified/progress?sid=${sessionId}`
    });

    expect(progressResponse.statusCode).toBe(200);
    const progressBody = JSON.parse(progressResponse.body);
    
    expect(progressBody.session_id).toBe(sessionId);
    expect(progressBody.items).toBeDefined();
  });

  test('difficulty progression follows learning science principles', async () => {
    const testSequence = [
      // Start easy, struggle, then improve
      { user_answer: 'correct', latency_ms: 5000, expected_difficulty: 'easy' },
      { user_answer: 'wrong', latency_ms: 35000, expected_difficulty: 'hard' },
      { user_answer: 'wrong', latency_ms: 30000, expected_difficulty: 'hard' },
      { user_answer: 'correct', latency_ms: 15000, expected_difficulty: 'medium' },
      { user_answer: 'correct', latency_ms: 8000, expected_difficulty: 'easy' }
    ];

    for (let i = 0; i < testSequence.length; i++) {
      const testCase = testSequence[i];
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/score',
        payload: {
          item_id: `progression-item-${i}`,
          user_answer: testCase.user_answer,
          expected_answer: 'correct',
          latency_ms: testCase.latency_ms,
          hint_count: testCase.user_answer === 'wrong' ? 1 : 0
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.difficulty).toBe(testCase.expected_difficulty);
      
      // Verify explanation is provided when struggling
      if (testCase.user_answer === 'wrong' || testCase.latency_ms > 20000) {
        expect(body.explain).toBeTruthy();
      }
    }
  });

  test('adaptive feedback is contextually appropriate', async () => {
    const scenarios = [
      {
        response_text: 'wrong',
        latency_ms: 45000,
        expected_rationale_contains: 'Not quite right',
        description: 'struggling learner'
      },
      {
        response_text: 'correct answer text',
        latency_ms: 6000,
        expected_rationale_contains: 'Well done',
        description: 'confident learner'
      },
      {
        response_text: 'correct answer text',
        latency_ms: 25000,
        expected_rationale_contains: 'Correct, but took longer',
        description: 'slow but correct'
      }
    ];

    for (const scenario of scenarios) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/score',
        payload: {
          item_id: 'feedback-item',
          response_text: scenario.response_text,
          expected_answer: 'correct answer text',
          latency_ms: scenario.latency_ms
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.data).toBeDefined();
      expect(body.data.rationale).toContain(scenario.expected_rationale_contains);
      expect(body.data.correct).toBeDefined();
      expect(body.data.signals).toBeDefined();
    }
  });

  test('performance metrics are tracked accurately', async () => {
    const sessionId = 'metrics-session';
    
    // Schedule items
    await app.inject({
      method: 'POST',
      url: '/api/certified/schedule',
      payload: {
        session_id: sessionId,
        plan_id: 'metrics-plan',
        items: [
          { id: 'metric-item-1', difficulty: 'medium' },
          { id: 'metric-item-2', difficulty: 'medium' }
        ]
      }
    });

    // Record various performance metrics
    const metrics = [
      { response: 'correct answer', latency: 8000, expected_latency_bucket: 'fast' },
      { response: 'wrong', latency: 25000, expected_latency_bucket: 'ok' },
      { response: 'correct answer', latency: 12000, expected_latency_bucket: 'ok' }
    ];

    for (const metric of metrics) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/score',
        payload: {
          item_id: 'metric-item',
          response_text: metric.response,
          expected_answer: 'correct answer',
          latency_ms: metric.latency
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      // Verify signals are captured
      expect(body.data).toBeDefined();
      expect(body.data.signals).toBeDefined();
      expect(body.data.signals.latency_bucket).toBe(metric.expected_latency_bucket);
      expect(body.data.signals.difficulty_delta).toBeDefined();
      expect(body.data.signals.next_review_suggestion_s).toBeDefined();
      expect(body.data.correct).toBeDefined();
    }
  });
});
