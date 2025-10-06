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
  evaluateContentQuality,
  type ContentBody,
  type QualityMetrics
} from '../lib/canon';

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
  user_answer: z.union([z.string(), z.number(), z.array(z.string())]),
  expected_answer: z.union([z.string(), z.number(), z.array(z.string())]).optional(),
  // New: telemetry for auto-assessment
  latency_ms: z.number().optional(),
  item_difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  hint_count: z.number().int().min(0).optional(),
  retry_count: z.number().int().min(0).optional(),
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
      
      // Deterministic stub response
      const hash = createHash('sha256').update(body.content).digest('hex').slice(0, 8);
      const summary = `Preview summary for content (${body.content.slice(0, 50)}...)`;
      const proposed_modules = [
        { id: `mod-${hash}-1`, title: 'Introduction', estimated_items: 5 },
        { id: `mod-${hash}-2`, title: 'Core Concepts', estimated_items: 8 },
        { id: `mod-${hash}-3`, title: 'Advanced Topics', estimated_items: 6 },
      ];
      const clarifying_questions = [
        'What is your current familiarity with this topic?',
        'Are you preparing for a specific exam or certification?',
      ];

      logUsage('/api/preview', 'gpt-5-mini', 150, 75);

      return reply.code(200).send({
        summary,
        proposed_modules,
        clarifying_questions,
      });
    } catch (err: any) {
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
      
      // Check canon store first for existing high-quality content
      const topic = body.modules[0]?.title || 'general';
      const existingContent = await searchCanonicalContent({
        topic,
        minQuality: 0.8,
        limit: 1
      });

      let response: any;
      let source: 'canon' | 'fresh' = 'fresh';
      let modelTier = 'gpt-5'; // Default to high-quality model

      if (existingContent.length > 0) {
        // Use canonical content
        const canonical = existingContent[0];
        response = {
          modules: canonical.content.modules.map(m => ({
            id: m.id,
            title: m.title,
            lessons: [{ id: m.id, title: m.title, explanation: m.content }],
            items: [
              {
                id: `${m.id}-q1`,
                type: 'mcq' as const,
                prompt: `What is the main concept in ${m.title}?`,
                choices: ['Option A', 'Option B', 'Option C', 'Option D'],
                answer: 0,
              },
              {
                id: `${m.id}-q2`,
                type: 'free' as const,
                prompt: `Explain ${m.title} in your own words.`,
                answer: null,
              },
            ],
          }))
        };
        source = 'canon';
        modelTier = 'gpt-4o-mini'; // Use cheaper model for canon content
        
        console.log(`[m3] Using canonical content for topic: ${topic}`);
      } else {
        // Generate new content with quality-first pipeline
        const modules = body.modules.map((m, idx) => ({
          id: `module-${idx + 1}`,
          title: m.title,
          lessons: [
            {
              id: `lesson-${idx + 1}-1`,
              title: `${m.title} - Part 1`,
              explanation: `This is a detailed explanation of ${m.title.toLowerCase()}.`,
            },
          ],
          items: [
            {
              id: `item-${idx + 1}-1`,
              type: 'mcq' as const,
              prompt: `What is the main concept in ${m.title}?`,
              choices: ['Option A', 'Option B', 'Option C', 'Option D'],
              answer: 0,
            },
            {
              id: `item-${idx + 1}-2`,
              type: 'free' as const,
              prompt: `Explain ${m.title} in your own words.`,
              answer: null,
            },
          ],
        }));

        response = { modules };

        // Canonize the new content
        const contentBody: ContentBody = {
          title: body.modules[0]?.title || 'Generated Content',
          summary: `Generated learning content for ${topic}`,
          modules: modules.map(m => ({
            id: m.id,
            title: m.title,
            content: m.lessons[0].explanation,
            type: 'lesson' as const
          })),
          metadata: {
            topic,
            difficulty: 'intermediate',
            estimatedTime: modules.length * 15,
            prerequisites: [],
            learningObjectives: modules.map(m => `Understand ${m.title}`)
          }
        };

        // Evaluate quality and canonize if high enough
        const qualityScores = evaluateContentQuality(contentBody);
        if (qualityScores.overall >= 0.7) {
          await canonizeContent(
            contentBody,
            ['gpt-5'], // Source models
            qualityScores,
            [] // Validation results
          );
          console.log(`[m3] Canonized new content for topic: ${topic}, quality: ${qualityScores.overall}`);
        }
      }

      // Validate against schema
      if (!validateModules(response)) {
        console.error('[m3] Schema validation failed');
        return reply.code(500).send({
          error: {
            code: 'SCHEMA_VALIDATION_FAILED',
            message: 'Generated modules do not match schema',
          },
        });
      }

      // Add source metadata to response
      const finalResponse = {
        ...response,
        metadata: {
          source,
          modelTier,
          qualityFirst: source === 'fresh',
          canonized: source === 'canon'
        }
      };

      logUsage('/api/generate', modelTier, source === 'canon' ? 100 : 800, source === 'canon' ? 200 : 1200);

      return reply.code(200).send(finalResponse);
    } catch (err: any) {
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

  // POST /api/score (Auto-assessment version)
  app.post('/api/score', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = ScoreRequestZ.parse(req.body);
      
      // Determine correctness using answer comparison + telemetry
      const userStr = String(body.user_answer).toLowerCase().trim();
      const expectedStr = body.expected_answer ? String(body.expected_answer).toLowerCase().trim() : '';
      
      // Correctness heuristic
      let correct = false;
      if (expectedStr && userStr === expectedStr) {
        correct = true;
      } else if (userStr.includes('correct') || userStr.length > 10) {
        // Stub: longer answers or those containing "correct" assumed valid
        correct = true;
      }
      
      // Difficulty inference (from telemetry + correctness)
      let difficulty: 'easy' | 'medium' | 'hard' = body.item_difficulty || 'medium';
      const latency = body.latency_ms || 0;
      const hintCount = body.hint_count || 0;
      
      if (latency > 30000 || hintCount > 1) {
        difficulty = 'hard';
      } else if (latency < 10000 && hintCount === 0 && correct) {
        difficulty = 'easy';
      }
      
      // Explanation (shown on wrong or slow answers)
      const shouldExplain = !correct || latency > 20000;
      const explain = shouldExplain
        ? `The correct approach is: ${expectedStr || 'Review the concept and try again'}. ${
            latency > 20000 ? 'Try breaking it down into smaller steps next time.' : ''
          }`
        : '';
      
      // Next hint (if they struggled)
      const next_hint = hintCount > 0 && !correct
        ? 'Focus on the key definition first, then apply it to the example.'
        : undefined;
      
      // Diagnostics for adaptive engine
      const diagnostics = {
        latency_ms: latency,
        hint_count: hintCount,
        retry_count: body.retry_count || 0,
        confidence: correct && latency < 15000 ? 'high' : correct ? 'medium' : 'low',
      };
      
      const result = {
        correct,
        difficulty,
        explain,
        next_hint,
        diagnostics,
        // Legacy fields for backward compat (will be removed in v2)
        score: correct ? 1.0 : 0.0,
        misconceptions: !correct ? ['Review the core concepts', 'Practice more examples'] : [],
        next_review_days: correct ? 7 : 1,
      };

      logUsage('/api/score', 'gpt-5-nano', 50, 30);

      return reply.code(200).send(result);
    } catch (err: any) {
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
        return reply.code(200).send({
          queue: [],
          message: 'Session complete! All items reviewed.',
          assigned_difficulty,
          adaptation_reason,
        });
      }

      logUsage('/api/daily/next', 'selector-v1', 0, 0);

      return reply.code(200).send({ 
        queue,
        assigned_difficulty,
        adaptation_reason,
      });
    } catch (err: any) {
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

      return reply.code(200).send({
        generated_at: now.toISOString(),
        today,
        yesterday,
        aggregates: dailyAggregates,
      });
    } catch (err: any) {
      return reply.code(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Usage aggregation failed' },
      });
    }
  });

}
