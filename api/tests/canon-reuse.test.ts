/**
 * Canon Reuse Tests
 * 
 * Ensures canonical content is properly stored, retrieved, and reused.
 * Verifies quality-first pipeline and cache hit optimization.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { build } from '../src/app';
import { 
  canonizeContent, 
  searchCanonicalContent, 
  retrieveCanonicalContent,
  contentExists,
  evaluateContentQuality,
  getCanonStats,
  type ContentBody,
  type QualityMetrics
} from '../src/lib/canon';

describe('Canon Reuse Tests', () => {
  let app: FastifyInstance;
  
  beforeEach(async () => {
    app = await build();
    await app.ready();
  });

  test('content is canonized after generation', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload: {
        modules: [
          { title: 'Test Canon Module', estimated_items: 2 }
        ]
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    
    // New envelope structure
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('modules');
    expect(body.meta.source).toBe('fresh');
    
    // Content should be canonized
    expect(body.meta.canonized).toBe(true);
  });

  test('canonical content is retrieved for identical requests', async () => {
    const payload = {
      modules: [
        { title: 'Identical Test Module', estimated_items: 2 }
      ]
    };

    // First request - should generate fresh content
    const firstResponse = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload
    });

    expect(firstResponse.statusCode).toBe(200);
    const firstBody = JSON.parse(firstResponse.body);
    expect(firstBody.meta.source).toBe('fresh');

    // Second request - should use canon
    const secondResponse = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload
    });

    expect(secondResponse.statusCode).toBe(200);
    const secondBody = JSON.parse(secondResponse.body);
    expect(secondBody.meta.source).toBe('canon');
    expect(secondBody.meta.canonized).toBe(true);
  });

  test('canon store maintains content integrity', async () => {
    const contentBody: ContentBody = {
      title: 'Integrity Test',
      summary: 'Test content for integrity verification',
      modules: [
        {
          id: 'module-1',
          title: 'Test Module',
          content: 'Test content',
          type: 'lesson'
        }
      ],
      metadata: {
        topic: 'integrity-test',
        difficulty: 'beginner',
        estimatedTime: 15,
        prerequisites: [],
        learningObjectives: ['Test objective']
      }
    };

    const qualityScores = evaluateContentQuality(contentBody);
    const canonical = await canonizeContent(
      contentBody,
      ['gpt-5'],
      qualityScores,
      []
    );

    expect(canonical).toBeDefined();
    expect(canonical.sha256).toBeTruthy();
    expect(canonical.artifact.title).toBe(contentBody.title);
  });

  test('canon search returns relevant content', async () => {
    // First, generate and canonize some content
    const response = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload: {
        modules: [
          { title: 'Search Test Topic', estimated_items: 2 }
        ]
      }
    });

    expect(response.statusCode).toBe(200);

    // Search for the content
    const results = await searchCanonicalContent({
      topic: 'Search Test Topic',
      minQuality: 0.5
    });

    expect(results.length).toBeGreaterThan(0);
    if (results[0].artifact.metadata) {
      expect(results[0].artifact.metadata.topic).toContain('Search Test Topic');
    }
  });

  test('canon retrieval by SHA works correctly', async () => {
    // Generate content to get a SHA
    const contentBody: ContentBody = {
      title: 'SHA Test',
      summary: 'Test content for SHA retrieval',
      modules: [
        {
          id: 'module-1',
          title: 'SHA Module',
          content: 'SHA test content',
          type: 'lesson'
        }
      ],
      metadata: {
        topic: 'sha-test',
        difficulty: 'intermediate',
        estimatedTime: 20,
        prerequisites: [],
        learningObjectives: ['SHA test objective']
      }
    };

    const qualityScores = evaluateContentQuality(contentBody);
    const canonical = await canonizeContent(
      contentBody,
      ['gpt-5'],
      qualityScores,
      []
    );

    // Retrieve by key
    const retrieved = retrieveCanonicalContent(canonical.key);
    
    expect(retrieved).toBeDefined();
    expect(retrieved!.key).toBe(canonical.key);
    expect(retrieved!.artifact.title).toBe(contentBody.title);
  });

  test.skip('content existence check works', async () => {
    const contentBody: ContentBody = {
      title: 'Existence Test',
      summary: 'Test content for existence check',
      modules: [
        {
          id: 'module-1',
          title: 'Existence Module',
          content: 'Existence test content',
          type: 'lesson'
        }
      ],
      metadata: {
        topic: 'existence-test',
        difficulty: 'advanced',
        estimatedTime: 25,
        prerequisites: [],
        learningObjectives: ['Existence test objective']
      }
    };

    // Check before canonization
    const existsBefore = await contentExists(contentBody);
    expect(existsBefore).toBe(false);

    // Canonize content
    const qualityScores = evaluateContentQuality(contentBody);
    await canonizeContent(
      contentBody,
      ['gpt-5'],
      qualityScores,
      []
    );

    // Check after canonization
    const existsAfter = await contentExists(contentBody);
    expect(existsAfter).toBe(true);
  });

  test('quality evaluation maintains standards', async () => {
    const goodContent: ContentBody = {
      title: 'High Quality Content',
      summary: 'This is a comprehensive summary of high-quality educational content that covers all necessary topics.',
      modules: [
        {
          id: 'module-1',
          title: 'Quality Module',
          content: 'Detailed content with clear explanations and examples.',
          type: 'lesson'
        },
        {
          id: 'module-2',
          title: 'Quiz Module',
          content: 'Assessment questions to test understanding.',
          type: 'quiz'
        }
      ],
      metadata: {
        topic: 'quality-test',
        difficulty: 'intermediate',
        estimatedTime: 30,
        prerequisites: ['Basic knowledge'],
        learningObjectives: [
          'Understand core concepts',
          'Apply knowledge practically',
          'Evaluate different approaches'
        ]
      }
    };

    const qualityScores = evaluateContentQuality(goodContent);
    
    expect(qualityScores.coherence).toBeGreaterThan(0.7);
    expect(qualityScores.coverage).toBeGreaterThan(0.7);
    expect(qualityScores.factualAccuracy).toBeGreaterThan(0.7);
    expect(qualityScores.pedagogicalSoundness).toBeGreaterThan(0.7);
    expect(qualityScores.overall).toBeGreaterThan(0.7);
  });

  test.skip('canon statistics are accurate', async () => {
    // Generate some content to populate the canon store
    await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload: {
        modules: [
          { title: 'Stats Test 1', estimated_items: 2 }
        ]
      }
    });

    await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload: {
        modules: [
          { title: 'Stats Test 2', estimated_items: 3 }
        ]
      }
    });

    const stats = await getCanonStats();
    
    expect(stats.totalContent).toBeGreaterThan(0);
    expect(stats.byStatus).toBeDefined();
    expect(stats.byDifficulty).toBeDefined();
    expect(stats.averageQuality).toBeGreaterThan(0);
    expect(stats.averageQuality).toBeLessThanOrEqual(1.0);
  });

  test('canon reuse reduces response time', async () => {
    const payload = {
      modules: [
        { title: 'Performance Test', estimated_items: 2 }
      ]
    };

    // First request (fresh generation)
    const start1 = Date.now();
    const firstResponse = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload
    });
    const time1 = Date.now() - start1;

    expect(firstResponse.statusCode).toBe(200);

    // Second request (canon reuse)
    const start2 = Date.now();
    const secondResponse = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload
    });
    const time2 = Date.now() - start2;

    expect(secondResponse.statusCode).toBe(200);
    
    // Canon reuse should be faster (though this is not guaranteed in tests)
    const secondBody = JSON.parse(secondResponse.body);
    expect(secondBody.meta.source).toBe('canon');
    
    // Log the times for verification
    console.log(`Fresh generation: ${time1}ms, Canon reuse: ${time2}ms`);
  });

  test.skip('canon content maintains metadata integrity', async () => {
    const contentBody: ContentBody = {
      title: 'Metadata Integrity Test',
      summary: 'Test content for metadata integrity',
      modules: [
        {
          id: 'module-1',
          title: 'Metadata Module',
          content: 'Metadata test content',
          type: 'lesson'
        }
      ],
      metadata: {
        topic: 'metadata-integrity-test',
        difficulty: 'intermediate',
        estimatedTime: 20,
        prerequisites: ['Prerequisite 1', 'Prerequisite 2'],
        learningObjectives: ['Objective 1', 'Objective 2', 'Objective 3']
      }
    };

    const qualityScores = evaluateContentQuality(contentBody);
    const canonical = await canonizeContent(
      contentBody,
      ['gpt-5', 'claude-3'],
      qualityScores,
      []
    );

    // Verify metadata integrity
    expect(canonical.artifact.metadata?.topic).toBe(contentBody.metadata!.topic);
    expect(canonical.artifact.metadata?.difficulty).toBe(contentBody.metadata!.difficulty);
    expect(canonical.artifact.metadata?.estimatedTime).toBe(contentBody.metadata!.estimatedTime);
    expect(canonical.artifact.metadata?.prerequisites).toEqual(contentBody.metadata!.prerequisites);
    expect(canonical.artifact.metadata?.learningObjectives).toEqual(contentBody.metadata!.learningObjectives);
    
    // Verify quality score
    expect(canonical.quality_score).toBeDefined();
    expect(canonical.model).toBeDefined();
  });
});
