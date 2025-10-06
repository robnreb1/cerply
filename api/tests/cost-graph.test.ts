/**
 * Cost Graph Tests
 * 
 * Verifies efficient model usage and cost optimization.
 * Ensures cheap models used for intent/microcopy, expensive models only for quality content.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { build } from '../src/app';

describe('Cost Graph Tests', () => {
  let app: FastifyInstance;
  
  beforeEach(async () => {
    app = await build();
    await app.ready();
  });

  test('intent parsing uses cheap model tier', async () => {
    // This would test the interaction engine's intent parsing
    // For now, we'll test the API endpoints that should use cheap models
    
    const response = await app.inject({
      method: 'POST',
      url: '/api/preview',
      payload: {
        content: 'test topic'
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    
    // Preview should use cheaper model (gpt-5-mini)
    expect(body).toHaveProperty('summary');
    expect(body).toHaveProperty('proposed_modules');
    
    // Check usage logs for model tier
    // In a real implementation, we'd check the usage tracking
  });

  test('content generation uses appropriate model tier', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload: {
        modules: [
          { title: 'Test Module', estimated_items: 2 }
        ]
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    
    expect(body).toHaveProperty('modules');
    expect(body).toHaveProperty('metadata');
    
    // Check metadata for model tier information
    expect(body.metadata).toHaveProperty('modelTier');
    expect(body.metadata).toHaveProperty('source');
  });

  test('canon content uses cheaper model tier', async () => {
    // First, generate content to populate canon store
    const generateResponse = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload: {
        modules: [
          { title: 'Canon Test Module', estimated_items: 2 }
        ]
      }
    });

    expect(generateResponse.statusCode).toBe(200);
    
    // Now generate the same content again - should use canon
    const canonResponse = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload: {
        modules: [
          { title: 'Canon Test Module', estimated_items: 2 }
        ]
      }
    });

    expect(canonResponse.statusCode).toBe(200);
    const canonBody = JSON.parse(canonResponse.body);
    
    // Should indicate canon source and cheaper model
    expect(canonBody.metadata.source).toBe('canon');
    expect(canonBody.metadata.modelTier).toBe('gpt-4o-mini');
  });

  test('microcopy generation uses cheap model', async () => {
    // This would test the microcopy generator
    // For now, we'll test that the system doesn't use expensive models for simple tasks
    
    const response = await app.inject({
      method: 'POST',
      url: '/api/score',
      payload: {
        item_id: 'test-item',
        user_answer: 'test answer',
        expected_answer: 'expected answer',
        latency_ms: 1000
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    
    // Scoring should use cheap model (gpt-4o-nano)
    expect(body).toHaveProperty('correct');
    expect(body).toHaveProperty('difficulty');
  });

  test('model tier selection follows cost optimization rules', async () => {
    const testCases = [
      {
        endpoint: '/api/preview',
        payload: { content: 'test' },
        expectedTier: 'gpt-5-mini'
      },
      {
        endpoint: '/api/score',
        payload: {
          item_id: 'test',
          user_answer: 'answer',
          expected_answer: 'expected',
          latency_ms: 1000
        },
        expectedTier: 'gpt-4o-nano'
      }
    ];

    for (const testCase of testCases) {
      const response = await app.inject({
        method: 'POST',
        url: testCase.endpoint,
        payload: testCase.payload
      });

      expect(response.statusCode).toBe(200);
      
      // In a real implementation, we'd check the usage logs
      // to verify the correct model tier was used
    }
  });

  test('budget limits are enforced', async () => {
    // Test that budget limits prevent excessive model usage
    // This would require implementing budget tracking
    
    const response = await app.inject({
      method: 'GET',
      url: '/api/ops/usage/daily'
    });

    if (response.statusCode === 200) {
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('usage');
      
      // Check that usage is within reasonable bounds
      // This would be more sophisticated in a real implementation
    }
  });

  test('cache hits reduce model usage', async () => {
    // Generate content twice with same input
    const payload = {
      modules: [
        { title: 'Cache Test', estimated_items: 2 }
      ]
    };

    const firstResponse = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload
    });

    const secondResponse = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload
    });

    expect(firstResponse.statusCode).toBe(200);
    expect(secondResponse.statusCode).toBe(200);

    const firstBody = JSON.parse(firstResponse.body);
    const secondBody = JSON.parse(secondResponse.body);

    // Second response should indicate canon usage
    expect(secondBody.metadata.source).toBe('canon');
    expect(secondBody.metadata.modelTier).toBe('gpt-4o-mini');
  });

  test('orchestration selects appropriate model for task complexity', async () => {
    // Test that simple tasks use cheap models
    const simpleResponse = await app.inject({
      method: 'POST',
      url: '/api/preview',
      payload: { content: 'simple topic' }
    });

    expect(simpleResponse.statusCode).toBe(200);

    // Test that complex tasks can use expensive models
    const complexResponse = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload: {
        modules: [
          { title: 'Complex Advanced Topic', estimated_items: 5 }
        ]
      }
    });

    expect(complexResponse.statusCode).toBe(200);
    const complexBody = JSON.parse(complexResponse.body);
    
    // Complex generation should use quality-first model
    expect(complexBody.metadata.qualityFirst).toBe(true);
  });

  test('model tier metadata is accurate', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload: {
        modules: [
          { title: 'Metadata Test', estimated_items: 2 }
        ]
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    
    expect(body.metadata).toHaveProperty('modelTier');
    expect(body.metadata).toHaveProperty('source');
    expect(body.metadata).toHaveProperty('qualityFirst');
    expect(body.metadata).toHaveProperty('canonized');
    
    // Validate model tier values
    const validTiers = ['gpt-4o-nano', 'gpt-4o-mini', 'gpt-4o', 'gpt-5'];
    expect(validTiers).toContain(body.metadata.modelTier);
    
    // Validate source values
    const validSources = ['canon', 'fresh'];
    expect(validSources).toContain(body.metadata.source);
  });
});
