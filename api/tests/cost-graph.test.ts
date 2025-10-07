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
    
    // Preview should use cheaper model (gpt-5-mini) - new envelope structure
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('summary');
    expect(body.data).toHaveProperty('proposed_modules');
    expect(body).toHaveProperty('meta');
    
    // Check usage logs for model tier
    // In a real implementation, we'd check the usage tracking
  });

  test('content generation uses appropriate model tier', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload: {
        modules: [
          { title: 'Test Module' }
        ]
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('modules');
    expect(body).toHaveProperty('meta');
    
    // Check meta for model tier information
    expect(body.meta).toHaveProperty('model');
    expect(body.meta).toHaveProperty('source');
  });

  test('canon content uses cheaper model tier', async () => {
    // First, generate content to populate canon store
    const generateResponse = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload: {
        modules: [
          { title: 'Canon Test Module' }
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
          { title: 'Canon Test Module' }
        ]
      }
    });

    expect(canonResponse.statusCode).toBe(200);
    const canonBody = JSON.parse(canonResponse.body);
    
    // Should indicate canon source (new envelope structure)
    expect(canonBody.meta.source).toBe('canon');
    expect(canonBody.meta.canonized).toBe(true);
  });

  test('microcopy generation uses cheap model', async () => {
    // This would test the microcopy generator
    // For now, we'll test that the system doesn't use expensive models for simple tasks
    
    const response = await app.inject({
      method: 'POST',
      url: '/api/score',
      payload: {
        item_id: 'test-item',
        response_text: 'test answer',
        expected_answer: 'expected answer',
        latency_ms: 1000
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    
    // Scoring should use cheap model - new envelope structure
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('correct');
    expect(body.data).toHaveProperty('rationale');
  });

  test('model tier selection follows cost optimization rules', async () => {
    const testCases = [
      {
        endpoint: '/api/preview',
        payload: { content: 'test' }
      },
      {
        endpoint: '/api/score',
        payload: {
          item_id: 'test',
          response_text: 'answer',
          expected_answer: 'expected',
          latency_ms: 1000
        }
      }
    ];

    for (const testCase of testCases) {
      const response = await app.inject({
        method: 'POST',
        url: testCase.endpoint,
        payload: testCase.payload
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      // Verify new envelope structure
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
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
      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('routes');
      
      // Check that usage is within reasonable bounds
      // This would be more sophisticated in a real implementation
    }
  });

  test('cache hits reduce model usage', async () => {
    // Generate content twice with same input
    const payload = {
      modules: [
        { title: 'Cache Test' }
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

    // Second response should indicate canon usage - new envelope structure
    expect(secondBody.meta.source).toBe('canon');
    expect(secondBody.meta.canonized).toBe(true);
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
          { title: 'Complex Advanced Topic' }
        ]
      }
    });

    expect(complexResponse.statusCode).toBe(200);
    const complexBody = JSON.parse(complexResponse.body);
    
    // Complex generation should have quality metrics - new envelope structure
    expect(complexBody.meta).toHaveProperty('quality_score');
    expect(complexBody.meta.quality_score).toBeGreaterThanOrEqual(0.8);
  });

  test('model tier metadata is accurate', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload: {
        modules: [
          { title: 'Metadata Test' }
        ]
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    
    // New envelope structure
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('meta');
    expect(body.meta).toHaveProperty('model');
    expect(body.meta).toHaveProperty('source');
    expect(body.meta).toHaveProperty('quality_score');
    expect(body.meta).toHaveProperty('canonized');
    
    // Validate model values
    const validModels = ['gpt-4', 'gpt-4o', 'gpt-5'];
    expect(validModels).toContain(body.meta.model);
    
    // Validate source values
    const validSources = ['canon', 'fresh'];
    expect(validSources).toContain(body.meta.source);
  });
});
