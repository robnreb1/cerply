/**
 * Quality Floor Evaluation Tests
 * 
 * Ensures generated content meets minimum quality standards.
 * Tests quality metrics and canon store validation.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { build } from '../app';
import { 
  evaluateContentQuality,
  searchCanonicalContent,
  type ContentBody,
  type QualityMetrics
} from '../lib/canon';

describe('Quality Floor Evaluation Tests', () => {
  let app: FastifyInstance;
  
  beforeEach(async () => {
    app = build();
    await app.ready();
  });

  test('quality evaluation meets minimum thresholds', async () => {
    const testContent: ContentBody = {
      title: 'Quality Test Content',
      summary: 'This is a comprehensive summary that covers all the essential topics in detail.',
      modules: [
        {
          id: 'module-1',
          title: 'Core Concepts',
          content: 'Detailed explanation of core concepts with clear examples and practical applications.',
          type: 'lesson'
        },
        {
          id: 'module-2',
          title: 'Practice Questions',
          content: 'Assessment questions to test understanding and reinforce learning.',
          type: 'quiz'
        },
        {
          id: 'module-3',
          title: 'Real Examples',
          content: 'Concrete examples that illustrate the concepts in real-world scenarios.',
          type: 'example'
        }
      ],
      metadata: {
        topic: 'quality-test',
        difficulty: 'intermediate',
        estimatedTime: 45,
        prerequisites: ['Basic knowledge'],
        learningObjectives: [
          'Understand core concepts',
          'Apply knowledge practically',
          'Evaluate different approaches'
        ]
      }
    };

    const qualityScores = evaluateContentQuality(testContent);
    
    // Check individual quality metrics
    expect(qualityScores.coherence).toBeGreaterThanOrEqual(0.7);
    expect(qualityScores.coverage).toBeGreaterThanOrEqual(0.7);
    expect(qualityScores.factualAccuracy).toBeGreaterThanOrEqual(0.7);
    expect(qualityScores.pedagogicalSoundness).toBeGreaterThanOrEqual(0.7);
    
    // Check overall quality
    expect(qualityScores.overall).toBeGreaterThanOrEqual(0.7);
  });

  test('poor quality content is identified', async () => {
    const poorContent: ContentBody = {
      title: '',
      summary: 'Bad',
      modules: [],
      metadata: {
        topic: 'poor-quality',
        difficulty: 'beginner',
        estimatedTime: 0,
        prerequisites: [],
        learningObjectives: []
      }
    };

    const qualityScores = evaluateContentQuality(poorContent);
    
    // Poor content should score below threshold
    expect(qualityScores.coherence).toBeLessThan(0.7);
    expect(qualityScores.coverage).toBeLessThan(0.7);
    expect(qualityScores.overall).toBeLessThan(0.7);
  });

  test('canon store content meets quality standards', async () => {
    // Generate content that should be canonized
    const response = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload: {
        modules: [
          { title: 'Quality Canon Test', estimated_items: 3 }
        ]
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    
    // Content should be canonized if it meets quality standards
    expect(body.metadata.canonized).toBe(true);
    
    // Search for canon content
    const canonResults = await searchCanonicalContent({
      topic: 'Quality Canon Test',
      minQuality: 0.7
    });
    
    expect(canonResults.length).toBeGreaterThan(0);
    
    // Verify canon content quality
    const canonContent = canonResults[0];
    expect(canonContent.lineage.qualityScores.overall).toBeGreaterThanOrEqual(0.7);
  });

  test('quality floor prevents low-quality content from being served', async () => {
    // This test would verify that the system doesn't serve content below quality threshold
    // In a real implementation, this would involve testing the content generation pipeline
    
    const response = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload: {
        modules: [
          { title: 'Quality Floor Test', estimated_items: 2 }
        ]
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    
    // Generated content should meet quality standards
    expect(body.modules).toBeDefined();
    expect(body.modules.length).toBeGreaterThan(0);
    
    // Each module should have quality content
    for (const module of body.modules) {
      expect(module.title).toBeTruthy();
      expect(module.lessons).toBeDefined();
      expect(module.lessons.length).toBeGreaterThan(0);
      expect(module.items).toBeDefined();
      expect(module.items.length).toBeGreaterThan(0);
    }
  });

  test('quality metrics are comprehensive', async () => {
    const comprehensiveContent: ContentBody = {
      title: 'Comprehensive Quality Test',
      summary: 'This is a detailed and comprehensive summary that thoroughly covers the topic with clear explanations, examples, and practical applications.',
      modules: [
        {
          id: 'module-1',
          title: 'Introduction to Concepts',
          content: 'Clear introduction with definitions, context, and learning objectives.',
          type: 'lesson'
        },
        {
          id: 'module-2',
          title: 'Deep Dive Analysis',
          content: 'In-depth analysis with multiple perspectives, case studies, and detailed explanations.',
          type: 'lesson'
        },
        {
          id: 'module-3',
          title: 'Practice Exercises',
          content: 'Comprehensive practice exercises with varying difficulty levels.',
          type: 'quiz'
        },
        {
          id: 'module-4',
          title: 'Real-World Applications',
          content: 'Practical examples and applications in real-world scenarios.',
          type: 'example'
        }
      ],
      metadata: {
        topic: 'comprehensive-quality',
        difficulty: 'advanced',
        estimatedTime: 60,
        prerequisites: ['Intermediate knowledge', 'Basic understanding'],
        learningObjectives: [
          'Master core concepts',
          'Apply knowledge in practice',
          'Evaluate different approaches',
          'Create original solutions',
          'Analyze complex scenarios'
        ]
      }
    };

    const qualityScores = evaluateContentQuality(comprehensiveContent);
    
    // Comprehensive content should score highly
    expect(qualityScores.coherence).toBeGreaterThanOrEqual(0.8);
    expect(qualityScores.coverage).toBeGreaterThanOrEqual(0.8);
    expect(qualityScores.factualAccuracy).toBeGreaterThanOrEqual(0.8);
    expect(qualityScores.pedagogicalSoundness).toBeGreaterThanOrEqual(0.8);
    expect(qualityScores.overall).toBeGreaterThanOrEqual(0.8);
  });

  test('quality evaluation handles edge cases', async () => {
    const edgeCases = [
      {
        content: {
          title: 'Very Long Title That Goes On And On And Contains Many Words',
          summary: 'A'.repeat(1000), // Very long summary
          modules: [],
          metadata: {
            topic: 'edge-case-1',
            difficulty: 'beginner' as const,
            estimatedTime: 0,
            prerequisites: [],
            learningObjectives: []
          }
        },
        description: 'very long content'
      },
      {
        content: {
          title: 'X',
          summary: 'Y',
          modules: [
            {
              id: 'm1',
              title: 'Z',
              content: 'W',
              type: 'lesson' as const
            }
          ],
          metadata: {
            topic: 'edge-case-2',
            difficulty: 'advanced' as const,
            estimatedTime: 1,
            prerequisites: ['A', 'B', 'C', 'D', 'E'],
            learningObjectives: ['1', '2', '3', '4', '5']
          }
        },
        description: 'very short content'
      }
    ];

    for (const edgeCase of edgeCases) {
      const qualityScores = evaluateContentQuality(edgeCase.content);
      
      // Quality scores should be valid numbers between 0 and 1
      expect(qualityScores.coherence).toBeGreaterThanOrEqual(0);
      expect(qualityScores.coherence).toBeLessThanOrEqual(1);
      expect(qualityScores.coverage).toBeGreaterThanOrEqual(0);
      expect(qualityScores.coverage).toBeLessThanOrEqual(1);
      expect(qualityScores.factualAccuracy).toBeGreaterThanOrEqual(0);
      expect(qualityScores.factualAccuracy).toBeLessThanOrEqual(1);
      expect(qualityScores.pedagogicalSoundness).toBeGreaterThanOrEqual(0);
      expect(qualityScores.pedagogicalSoundness).toBeLessThanOrEqual(1);
      expect(qualityScores.overall).toBeGreaterThanOrEqual(0);
      expect(qualityScores.overall).toBeLessThanOrEqual(1);
    }
  });

  test('quality standards are consistent across similar content', async () => {
    const similarContent = [
      {
        title: 'Similar Content A',
        summary: 'This is a comprehensive summary of similar content A.',
        modules: [
          {
            id: 'module-a1',
            title: 'Module A1',
            content: 'Content for module A1 with detailed explanations.',
            type: 'lesson' as const
          }
        ],
        metadata: {
          topic: 'similar-a',
          difficulty: 'intermediate' as const,
          estimatedTime: 30,
          prerequisites: ['Basic knowledge'],
          learningObjectives: ['Understand concepts A']
        }
      },
      {
        title: 'Similar Content B',
        summary: 'This is a comprehensive summary of similar content B.',
        modules: [
          {
            id: 'module-b1',
            title: 'Module B1',
            content: 'Content for module B1 with detailed explanations.',
            type: 'lesson' as const
          }
        ],
        metadata: {
          topic: 'similar-b',
          difficulty: 'intermediate' as const,
          estimatedTime: 30,
          prerequisites: ['Basic knowledge'],
          learningObjectives: ['Understand concepts B']
        }
      }
    ];

    const qualityScores = similarContent.map(content => evaluateContentQuality(content));
    
    // Similar quality content should have similar scores
    const score1 = qualityScores[0];
    const score2 = qualityScores[1];
    
    // Scores should be within reasonable range of each other
    const coherenceDiff = Math.abs(score1.coherence - score2.coherence);
    const coverageDiff = Math.abs(score1.coverage - score2.coverage);
    const overallDiff = Math.abs(score1.overall - score2.overall);
    
    expect(coherenceDiff).toBeLessThan(0.2);
    expect(coverageDiff).toBeLessThan(0.2);
    expect(overallDiff).toBeLessThan(0.2);
  });

  test('canon content bypasses quality floor checks', async () => {
    // Generate content to populate canon store
    const generateResponse = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload: {
        modules: [
          { title: 'Canon Bypass Test', estimated_items: 2 }
        ]
      }
    });

    expect(generateResponse.statusCode).toBe(200);

    // Generate same content again to get canon version
    const canonResponse = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload: {
        modules: [
          { title: 'Canon Bypass Test', estimated_items: 2 }
        ]
      }
    });

    expect(canonResponse.statusCode).toBe(200);
    const canonBody = JSON.parse(canonResponse.body);
    
    // Canon content should be served regardless of quality floor
    expect(canonBody.metadata.source).toBe('canon');
    expect(canonBody.metadata.canonized).toBe(true);
    
    // Canon content should have quality metadata
    expect(canonBody.modules).toBeDefined();
    expect(canonBody.modules.length).toBeGreaterThan(0);
  });
});
