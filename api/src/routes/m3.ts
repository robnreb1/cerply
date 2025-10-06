// api/src/routes/m3.ts
// EPIC M3 API Surface — preview, generate, score, daily/next endpoints
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

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
  })),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
});

const ScoreRequestZ = z.object({
  item_id: z.string(),
  user_answer: z.union([z.string(), z.number(), z.array(z.string())]),
  expected_answer: z.union([z.string(), z.number(), z.array(z.string())]).optional(),
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
      
      // Generate deterministic modules conforming to schema
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

      const response = { modules };

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

      logUsage('/api/generate', 'gpt-5', 800, 1200);

      return reply.code(200).send(response);
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

  // POST /api/score
  app.post('/api/score', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = ScoreRequestZ.parse(req.body);
      
      // Deterministic scoring stub
      const userStr = String(body.user_answer).toLowerCase();
      const expectedStr = body.expected_answer ? String(body.expected_answer).toLowerCase() : '';
      
      const isCorrect = userStr === expectedStr || userStr.includes('correct');
      const score = isCorrect ? 1.0 : 0.4;
      
      const result = {
        score,
        difficulty: score > 0.8 ? 'easy' : score > 0.5 ? 'medium' : 'hard',
        misconceptions: score < 0.6 ? ['Review the core concepts', 'Practice more examples'] : [],
        next_review_days: score > 0.8 ? 7 : score > 0.5 ? 3 : 1,
      };

      // Validate against schema
      if (!validateScore(result)) {
        console.error('[m3] Score schema validation failed');
        return reply.code(500).send({
          error: {
            code: 'SCHEMA_VALIDATION_FAILED',
            message: 'Score result does not match schema',
          },
        });
      }

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

  // GET /api/daily/next
  app.get('/api/daily/next', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      // Deterministic queue based on spaced repetition principles
      const queue = [
        {
          item_id: 'item-1',
          priority: 0.9,
          reason: 'due_for_review',
          due_at: new Date(Date.now() - 86400000).toISOString(),
          struggle_score: 0.6,
        },
        {
          item_id: 'item-2',
          priority: 0.7,
          reason: 'recent_mistake',
          due_at: new Date(Date.now() - 3600000).toISOString(),
          struggle_score: 0.8,
        },
        {
          item_id: 'item-3',
          priority: 0.5,
          reason: 'spaced_repetition',
          due_at: new Date().toISOString(),
          struggle_score: 0.3,
        },
      ];

      logUsage('/api/daily/next', 'selector-v1', 0, 0);

      return reply.code(200).send({ queue });
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
