// api/src/routes/m3.ts
// EPIC M3 API Surface — preview, generate, score, daily/next endpoints
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { 
  canonizeContent, 
  searchCanonicalContent, 
  retrieveCanonicalContent,
  contentExists,
  keyFrom,
  canonStore,
  type ContentBody,
  type QualityMetrics
} from '../lib/canon';
import { generateWithQualityRetry, scoreArtifact, evaluateQualityMetrics } from '../lib/quality';
import { trackFreshInvocation, trackReuseInvocation, getTodayAggregates } from '../lib/costGraph';

// --- Usage tracking store (in-memory for preview) ---
type UsageRecord = {
  ts: string;
  route: string;
  model_used: string;
  tokens_in: number;
  tokens_out: number;
  est_cost: number;
};

const usageStore: UsageRecord[] = [];

// --- Adaptive learner state (in-memory, sliding window N=5) ---
type AttemptRecord = {
  item_id: string;
  correct: boolean;
  latency_ms: number;
  difficulty: 'easy' | 'medium' | 'hard';
  hint_count: number;
  ts: string;
};

type LearnerState = {
  sid: string;
  attempts: AttemptRecord[]; // Sliding window, max 5
  current_difficulty: 'easy' | 'medium' | 'hard';
  seen_items: Set<string>; // Never-repeat-verbatim tracking
};

const learnerStateStore = new Map<string, LearnerState>();

function getLearnerState(sid: string): LearnerState {
  if (!learnerStateStore.has(sid)) {
    learnerStateStore.set(sid, {
      sid,
      attempts: [],
      current_difficulty: 'medium',
      seen_items: new Set(),
    });
  }
  return learnerStateStore.get(sid)!;
}

function recordAttempt(sid: string, attempt: AttemptRecord) {
  const state = getLearnerState(sid);
  state.attempts.push(attempt);
  // Keep only last 5 (sliding window)
  if (state.attempts.length > 5) {
    state.attempts.shift();
  }
  state.seen_items.add(attempt.item_id);
}

function shouldEaseDifficulty(state: LearnerState): boolean {
  // Rule: 2 consecutive incorrect at same difficulty with latency > 30s
  if (state.attempts.length < 2) return false;
  
  const lastTwo = state.attempts.slice(-2);
  const sameAuthor = lastTwo.every(a => !a.correct);
  const sameDifficulty = lastTwo.every(a => a.difficulty === state.current_difficulty);
  const slowResponses = lastTwo.every(a => a.latency_ms > 30000);
  
  return sameAuthor && sameDifficulty && slowResponses;
}

function shouldStepUpDifficulty(state: LearnerState): boolean {
  // Rule: 3 consecutive correct with latency < 10s and no hints
  if (state.attempts.length < 3) return false;
  
  const lastThree = state.attempts.slice(-3);
  const allCorrect = lastThree.every(a => a.correct);
  const fastResponses = lastThree.every(a => a.latency_ms < 10000);
  const noHints = lastThree.every(a => a.hint_count === 0);
  
  return allCorrect && fastResponses && noHints;
}

function logUsage(route: string, model: string, tokensIn: number, tokensOut: number) {
  const estCost = (tokensIn * 0.00001 + tokensOut * 0.00003); // stub pricing
  usageStore.push({
    ts: new Date().toISOString(),
    route,
    model_used: model,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    est_cost: estCost,
  });
}

// --- Zod request schemas ---
const PreviewRequestZ = z.object({
  content: z.string().min(1).max(50000),
  context: z.string().optional(),
});

const GenerateRequestZ = z.object({
  plan_id: z.string().optional(),
  modules: z.array(z.object({
    title: z.string(),
    topics: z.array(z.string()).optional(),
  })).min(1, 'At least one module is required'),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
});

const ScoreRequestZ = z.object({
  item_id: z.string(),
  response_text: z.string(),
  latency_ms: z.number().int().min(0),
  variants: z.array(z.string()).optional(), // Paraphrase variants for matching
  expected_answer: z.string().optional(), // For stub comparison
});

// --- Route registration ---
export async function registerM3Routes(app: FastifyInstance) {
  // Simple validators without AJV for now (to avoid complexity)
  const validateModules = (data: any) => {
    return data && Array.isArray(data.modules);
  };
  
  const validateScore = (data: any) => {
    return data && typeof data.score === 'number' && 
           ['easy', 'medium', 'hard'].includes(data.difficulty) &&
           Array.isArray(data.misconceptions) &&
           typeof data.next_review_days === 'number';
  };

  // POST /api/preview
  app.post('/api/preview', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = PreviewRequestZ.parse(req.body);
      
      // Check canon for preview
      const canonKey = keyFrom(body);
      const cached = retrieveCanonicalContent(canonKey);
      
      let xCanon = 'bypass';
      let xCost = 'fresh';
      let xQuality = '0.85';
      
      if (cached) {
        xCanon = 'hit';
        xCost = 'reuse';
        xQuality = cached.quality_score.toFixed(2);
        trackReuseInvocation('/api/preview', canonKey, cached.model);
        
        // Set headers
        reply.header('x-canon', xCanon);
        reply.header('x-quality', xQuality);
        reply.header('x-cost', xCost);
        reply.header('x-adapt', 'none');
        
        return reply.code(200).send({
          data: {
            summary: cached.artifact.summary,
            proposed_modules: cached.artifact.modules?.map((m, idx) => ({
              id: m.id,
              title: m.title,
              estimated_items: 5 + idx * 3,
            })) || [],
            clarifying_questions: [
              'What is your current familiarity with this topic?',
              'Are you preparing for a specific exam or certification?',
            ],
          },
          meta: {
            source: 'canon',
            canonized: true,
            quality_score: cached.quality_score,
          },
        });
      }
      
      // Generate fresh preview
      const hash = createHash('sha256').update(body.content).digest('hex').slice(0, 8);
      const summary = `Structured exploration of ${body.content.slice(0, 40)}, covering fundamental concepts, practical applications, and advanced techniques for comprehensive mastery.`;
      const proposed_modules = [
        { id: `mod-${hash}-1`, title: 'Foundations', estimated_items: 5 },
        { id: `mod-${hash}-2`, title: 'Core Principles', estimated_items: 8 },
        { id: `mod-${hash}-3`, title: 'Advanced Applications', estimated_items: 6 },
      ];
      const clarifying_questions = [
        'What is your current familiarity with this topic?',
        'Are you preparing for a specific exam or certification?',
      ];

      logUsage('/api/preview', 'gpt-5-mini', 150, 75);
      xCanon = 'store';
      xCost = 'fresh';
      
      // Set headers
      reply.header('x-canon', xCanon);
      reply.header('x-quality', xQuality);
      reply.header('x-cost', xCost);
      reply.header('x-adapt', 'none');

      return reply.code(200).send({
        data: {
          summary,
          proposed_modules,
          clarifying_questions,
        },
        meta: {
          source: 'fresh',
          canonized: false,
          quality_score: 0.85,
        },
      });
    } catch (err: any) {
      // Set headers on all error responses
      reply.header('x-canon', 'bypass');
      reply.header('x-quality', '0.00');
      reply.header('x-cost', 'fresh');
      reply.header('x-adapt', 'none');
      
      if (err instanceof z.ZodError) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: err.errors,
          },
        });
      }
      return reply.code(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Preview failed' },
      });
    }
  });

  // POST /api/generate
  app.post('/api/generate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = GenerateRequestZ.parse(req.body);
      
      // 1. Check canon store first
      const canonKey = keyFrom(body);
      const cached = retrieveCanonicalContent(canonKey);
      
      if (cached) {
        // Canon hit - return cached content
        trackReuseInvocation('/api/generate', canonKey, cached.model);
        
        // Set headers
        reply.header('x-canon', 'hit');
        reply.header('x-quality', cached.quality_score.toFixed(2));
        reply.header('x-cost', 'reuse');
        reply.header('x-adapt', 'none');
        
        const response = {
          data: {
            modules: cached.artifact.modules?.map(m => ({
              id: m.id,
              title: m.title,
              lessons: [
                {
                  id: `${m.id}-lesson-1`,
                  title: m.title,
                  explanation: m.content || m.description || 'Lesson content',
                },
              ],
              items: m.items || [],
            })) || [],
          },
          meta: {
            source: 'canon',
            canonized: true,
            model: cached.model,
            quality_score: cached.quality_score,
            quality_metrics: cached.quality_metrics,
          },
        };
        
        return reply.code(200).send(response);
      }
      
      // 2. Generate fresh content with quality retry
      const result = await generateWithQualityRetry(async (rigorMode: boolean) => {
        // Generate modules (stub implementation)
        const modules = body.modules.map((m, idx) => ({
          id: `module-${idx + 1}`,
          title: m.title,
          description: rigorMode 
            ? `Comprehensive exploration of ${m.title} with specific examples and detailed analysis covering fundamental concepts, advanced techniques, and real-world applications.`
            : `Structured approach to ${m.title} with clear explanations, practical examples, and progressive skill development.`,
          content: rigorMode
            ? `Detailed exposition on ${m.title}: Understanding the core principles, exploring advanced methodologies, and applying knowledge to practical scenarios with real-world case studies.`
            : `Introduction to ${m.title}: Core concepts explained clearly with examples and practical applications for effective learning.`,
          type: 'lesson' as const,
          items: [
            {
              id: `item-${idx + 1}-1`,
              prompt: `Explain the key concept of ${m.title}.`,
              type: 'free' as const,
            },
            {
              id: `item-${idx + 1}-2`,
              prompt: `Apply ${m.title} to a practical scenario.`,
              type: 'free' as const,
            },
          ],
        }));
        
        const artifact: ContentBody = {
          title: body.modules[0]?.title || 'Generated Content',
          summary: rigorMode
            ? `Comprehensive structured learning path exploring: ${body.modules.map(m => m.title).join(', ')} with in-depth analysis, practical examples, and progressive skill development across multiple domains.`
            : `Structured learning path covering: ${body.modules.map(m => m.title).join(', ')} with clear explanations and practice exercises.`,
          modules,
          metadata: {
            topic: body.modules[0]?.title || 'generated-content',
            difficulty: body.level || 'intermediate',
            estimatedTime: modules.length * 15,
            prerequisites: [],
            learningObjectives: body.modules.map(m => `Master ${m.title}`),
          },
        };
        
        return artifact;
      });
      
      // 3. Check quality floor
      if (result.quality_score < 0.8) {
        // Quality floor not met even after retry - return 503
        reply.header('x-canon', 'bypass');
        reply.header('x-quality', result.quality_score.toFixed(2));
        reply.header('x-cost', 'fresh');
        reply.header('x-adapt', 'none');
        
        return reply.code(503).send({
          error: {
            code: 'QUALITY_FLOOR',
            message: 'Generated content did not meet quality threshold even after retry',
            details: {
              quality_score: result.quality_score,
              threshold: 0.8,
              retried: result.retried,
              quality_metrics: result.quality_metrics,
            },
          },
        });
      }
      
      // 4. Store in canon (quality threshold met)
      canonizeContent(result.artifact, { 
        model: 'gpt-4',
        quality_score: result.quality_score,
        quality_metrics: result.quality_metrics,
      }, body);
      
      // 5. Track cost
      trackFreshInvocation('/api/generate', 'gpt-4', 800, 1200, canonKey);
      
      // 6. Set headers
      reply.header('x-canon', 'store');
      reply.header('x-quality', result.quality_score.toFixed(2));
      reply.header('x-cost', 'fresh');
      reply.header('x-adapt', 'none');
      
      // 7. Return response
      const response = {
        data: {
          modules: result.artifact.modules?.map(m => ({
            id: m.id,
            title: m.title,
            lessons: [
              {
                id: `${m.id}-lesson-1`,
                title: m.title,
                explanation: m.content || m.description || 'Lesson content',
              },
            ],
            items: m.items || [],
          })) || [],
        },
        meta: {
          source: 'fresh',
          canonized: true,
          model: 'gpt-4',
          quality_score: result.quality_score,
          quality_metrics: result.quality_metrics,
          retried: result.retried,
        },
      };
      
      return reply.code(200).send(response);
    } catch (err: any) {
      // Set headers on all error responses
      reply.header('x-canon', 'bypass');
      reply.header('x-quality', '0.00');
      reply.header('x-cost', 'fresh');
      reply.header('x-adapt', 'none');
      
      if (err instanceof z.ZodError) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: err.errors,
          },
        });
      }
      return reply.code(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Generation failed' },
      });
    }
  });

  // POST /api/score (Auto-assessment version - NO SELF-GRADE)
  app.post('/api/score', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = ScoreRequestZ.parse(req.body);
      
      // Determine correctness using answer comparison + variants
      const responseText = body.response_text.toLowerCase().trim();
      const expectedStr = body.expected_answer?.toLowerCase().trim() || '';
      
      // Check exact match or variants
      let correct = false;
      if (expectedStr && responseText === expectedStr) {
        correct = true;
      } else if (body.variants?.some(v => v.toLowerCase().trim() === responseText)) {
        correct = true;
      } else if (!expectedStr && responseText.length > 10) {
        // Stub: If no expected answer provided, assume longer answers are valid
        // This is a placeholder for future LLM-based scoring
        correct = true;
      }
      // If expectedStr is provided but doesn't match, correct remains false
      
      // Latency bucket
      const latency = body.latency_ms;
      let latency_bucket: 'fast' | 'ok' | 'slow' = 'ok';
      if (latency < 10000) latency_bucket = 'fast';
      else if (latency > 30000) latency_bucket = 'slow';
      
      // Paraphrase match (how close to variants)
      const paraphrase_match = body.variants?.some(v => v.toLowerCase().includes(responseText.slice(0, 20)))
        ? 0.8
        : 0.5;
      
      // Difficulty delta (adapt hint)
      let difficulty_delta: -1 | 0 | 1 = 0;
      if (!correct && latency_bucket === 'slow') difficulty_delta = -1; // Ease up
      else if (correct && latency_bucket === 'fast') difficulty_delta = 1; // Step up
      
      // Next review suggestion (seconds until next review)
      const next_review_suggestion_s = correct
        ? (latency_bucket === 'fast' ? 86400 * 7 : 86400 * 3) // 7 days fast, 3 days ok
        : 86400; // 1 day if wrong
      
      // Rationale (auto-generated explanation)
      const rationale = !correct || latency_bucket === 'slow'
        ? `${!correct ? 'Not quite right.' : 'Correct, but took longer.'} ${
            expectedStr ? `The key point is: "${expectedStr}".` : 'Review the concept and try again.'
          } ${latency_bucket === 'slow' ? 'Try breaking it into smaller steps.' : ''}`
        : 'Well done! You\'ve got this concept down.';
      
      // Signals for adaptive engine
      const signals = {
        latency_bucket,
        paraphrase_match,
        difficulty_delta,
        next_review_suggestion_s,
      };
      
      // Determine x-adapt header
      let xAdapt = 'none';
      if (difficulty_delta === -1) xAdapt = 'easy';
      else if (difficulty_delta === 1) xAdapt = 'hard';
      else if (!correct) xAdapt = 'review';
      
      // Record attempt for adaptive queue (CRITICAL FIX)
      const query = req.query as { sid?: string };
      const sid = query.sid || body.item_id.split('-')[0] || 'anon';
      const difficulty = body.expected_answer ? 'medium' : 'easy'; // Stub difficulty
      
      recordAttempt(sid, {
        item_id: body.item_id,
        correct,
        latency_ms: latency,
        difficulty,
        hint_count: 0, // Could be passed in request in future
        ts: new Date().toISOString(),
      });
      
      // Set headers
      reply.header('x-canon', 'bypass');
      reply.header('x-quality', '1.00');
      reply.header('x-cost', 'fresh');
      reply.header('x-adapt', xAdapt);

      logUsage('/api/score', 'gpt-5-nano', 50, 30);

      return reply.code(200).send({
        data: {
          correct,
          rationale,
          signals,
        },
        meta: {
          source: 'fresh',
        },
      });
    } catch (err: any) {
      // Set headers on all error responses
      reply.header('x-canon', 'bypass');
      reply.header('x-quality', '0.00');
      reply.header('x-cost', 'fresh');
      reply.header('x-adapt', 'none');
      
      if (err instanceof z.ZodError) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: err.errors,
          },
        });
      }
      return reply.code(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Scoring failed' },
      });
    }
  });

  // GET /api/daily/next (Adaptive version)
  app.get('/api/daily/next', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = req.query as { sid?: string };
      const sid = query.sid || 'anon';
      
      const state = getLearnerState(sid);
      
      // Check adaptive thresholds
      let assigned_difficulty = state.current_difficulty;
      let adaptation_reason = 'continuing';
      
      if (shouldEaseDifficulty(state)) {
        // Drop difficulty, enqueue scaffold
        if (assigned_difficulty === 'hard') assigned_difficulty = 'medium';
        else if (assigned_difficulty === 'medium') assigned_difficulty = 'easy';
        state.current_difficulty = assigned_difficulty;
        adaptation_reason = 'eased_after_struggle';
      } else if (shouldStepUpDifficulty(state)) {
        // Raise difficulty
        if (assigned_difficulty === 'easy') assigned_difficulty = 'medium';
        else if (assigned_difficulty === 'medium') assigned_difficulty = 'hard';
        state.current_difficulty = assigned_difficulty;
        adaptation_reason = 'stepped_up_mastery';
      }
      
      // Generate queue with paraphrase variants (never-repeat-verbatim)
      const baseItems = [
        { id: 'item-1', base: 'What is spaced repetition?', variants: [
          'Define spaced repetition',
          'Explain the concept of spaced repetition',
          'How would you describe spaced repetition?'
        ]},
        { id: 'item-2', base: 'What is the forgetting curve?', variants: [
          'Describe the forgetting curve',
          'Explain what happens on the forgetting curve',
          'What does the forgetting curve show?'
        ]},
        { id: 'item-3', base: 'How does active recall work?', variants: [
          'Define active recall',
          'What is active recall?',
          'Explain the active recall technique'
        ]},
      ];
      
      const queue = baseItems
        .filter(item => !state.seen_items.has(item.id)) // Skip already seen
        .map((item, idx) => {
          // Pick a variant (deterministic but not verbatim repeat)
          const variantIdx = state.attempts.length % item.variants.length;
          const prompt = state.seen_items.size === 0 ? item.base : item.variants[variantIdx];
          
          return {
            item_id: item.id,
            prompt,
            assigned_difficulty,
            priority: 1.0 - (idx * 0.1),
            reason: adaptation_reason,
            due_at: new Date().toISOString(),
          };
        })
        .slice(0, 5); // Top 5 items
      
      // If queue empty (all seen), reset seen_items
      if (queue.length === 0) {
        state.seen_items.clear();
        
        // Set headers
        reply.header('x-canon', 'bypass');
        reply.header('x-quality', '1.00');
        reply.header('x-cost', 'fresh');
        reply.header('x-adapt', adaptation_reason === 'eased_after_struggle' ? 'easy' : 
                                adaptation_reason === 'stepped_up_mastery' ? 'hard' : 'none');
        
        return reply.code(200).send({
          data: {
            queue: [],
            message: 'Session complete! All items reviewed.',
            assigned_difficulty,
          },
          meta: {
            adaptation_reason,
          },
        });
      }

      logUsage('/api/daily/next', 'selector-v1', 0, 0);

      // Set headers
      reply.header('x-canon', 'bypass');
      reply.header('x-quality', '1.00');
      reply.header('x-cost', 'fresh');
      reply.header('x-adapt', adaptation_reason === 'eased_after_struggle' ? 'easy' : 
                              adaptation_reason === 'stepped_up_mastery' ? 'hard' : 'none');

      return reply.code(200).send({ 
        data: {
          queue,
          assigned_difficulty,
        },
        meta: {
          adaptation_reason,
        },
      });
    } catch (err: any) {
      // Set headers on all error responses
      reply.header('x-canon', 'bypass');
      reply.header('x-quality', '0.00');
      reply.header('x-cost', 'fresh');
      reply.header('x-adapt', 'none');
      
      return reply.code(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Queue generation failed' },
      });
    }
  });

  // GET /api/ops/usage/daily
  app.get('/api/ops/usage/daily', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];

      // Aggregate by route and day
      const aggregates: Record<string, any> = {};
      
      usageStore.forEach((record) => {
        const day = record.ts.split('T')[0];
        const key = `${day}:${record.route}`;
        
        if (!aggregates[key]) {
          aggregates[key] = {
            date: day,
            route: record.route,
            requests: 0,
            total_tokens_in: 0,
            total_tokens_out: 0,
            total_cost: 0,
            models: new Set<string>(),
          };
        }
        
        aggregates[key].requests += 1;
        aggregates[key].total_tokens_in += record.tokens_in;
        aggregates[key].total_tokens_out += record.tokens_out;
        aggregates[key].total_cost += record.est_cost;
        aggregates[key].models.add(record.model_used);
      });

      // Convert to array and serialize Sets
      const dailyAggregates = Object.values(aggregates).map((agg: any) => ({
        ...agg,
        models: Array.from(agg.models),
      }));

      // Include cost graph data
      const costGraphData = getTodayAggregates();

      // Set headers
      reply.header('x-canon', 'bypass');
      reply.header('x-quality', '1.00');
      reply.header('x-cost', 'fresh');
      reply.header('x-adapt', 'none');

      return reply.code(200).send({
        data: {
          generated_at: now.toISOString(),
          today,
          yesterday,
          routes: dailyAggregates,
        },
        meta: {
          cost_graph: costGraphData, // Cost graph with reuse vs fresh
        },
      });
    } catch (err: any) {
      // Set headers on all error responses
      reply.header('x-canon', 'bypass');
      reply.header('x-quality', '0.00');
      reply.header('x-cost', 'fresh');
      reply.header('x-adapt', 'none');
      
      return reply.code(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Usage aggregation failed' },
      });
    }
  });

  // GET /api/ops/canon/_debug (non-prod only)
  if (process.env.NODE_ENV !== 'production') {
    app.get('/api/ops/canon/_debug', async (_req: FastifyRequest, reply: FastifyReply) => {
      const stats = {
        enabled: process.env.CANON_ENABLED === 'true',
        size: canonStore.getAllKeys().length,
        maxSize: 1000,
        keys: canonStore.getAllKeys().slice(0, 10), // First 10 keys
      };
      
      reply.header('x-canon', 'bypass');
      reply.header('x-quality', '1.00');
      reply.header('x-cost', 'fresh');
      reply.header('x-adapt', 'none');
      
      return reply.code(200).send({
        data: stats,
        meta: {
          source: 'canon_store',
        },
      });
    });
  }

  // GET /api/ops/canon/:key (test-only)
  if (process.env.NODE_ENV === 'test') {
    app.get('/api/ops/canon/:key', async (req: FastifyRequest, reply: FastifyReply) => {
      const params = req.params as { key: string };
      const record = retrieveCanonicalContent(params.key);
      
      if (!record) {
        // Set headers on error responses
        reply.header('x-canon', 'bypass');
        reply.header('x-quality', '0.00');
        reply.header('x-cost', 'fresh');
        reply.header('x-adapt', 'none');
        
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Canon entry not found' },
        });
      }
      
      // Set headers on success
      reply.header('x-canon', 'hit');
      reply.header('x-quality', record.quality_score.toFixed(2));
      reply.header('x-cost', 'reuse');
      reply.header('x-adapt', 'none');
      
      return reply.code(200).send({
        id: record.id,
        key: record.key,
        model: record.model,
        quality_score: record.quality_score,
        quality_metrics: record.quality_metrics,
        created_at: record.created_at,
        accessed_at: record.accessed_at,
        access_count: record.access_count,
      });
    });
  }

}
