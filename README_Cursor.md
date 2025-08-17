import Fastify from 'fastify';
import cors from '@fastify/cors';
import crypto from 'node:crypto';
import { z } from 'zod';

const app = Fastify({ logger: true });
app.register(cors, { origin: true });

// =========================
// Types & Validation
// =========================
export const GenerateItemsReqSchema = z.object({
  chunks: z.array(z.string().trim().min(1)).min(1),
  count_objectives: z.number().int().min(1).max(20).default(3),
  items_per_objective: z.number().int().min(1).max(10).default(3),
});
export type GenerateItemsReq = z.infer<typeof GenerateItemsReqSchema>;

export type MCQItem = {
  id: string;
  stem: string;
  options: string[];      // length 4
  correctIndex: number;   // 0..3
};

export type Objective = {
  id: string;
  title: string;
  items: MCQItem[];
};

// =========================
// Helpers
// =========================
function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length >= 20);
}

function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !stopWords.has(w));

  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .slice(0, 200);
}

const stopWords = new Set([
  'this','that','with','from','have','they','been','them','then','than','will','into','your','yours','their','there','about','after','before','which','while','were','where','what','when','shall','should','could','would','these','those','because','between','among','also','such','only','very','much','more','most','many','like','some','none','each','other','another','over','under','into','onto','http','https'
]);

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickN<T>(arr: T[], n: number): T[] {
  if (n <= 0) return [];
  if (arr.length <= n) return shuffle(arr).slice(0, n);
  return shuffle(arr).slice(0, n);
}

function makeDistractors(correct: string, pool: string[], count: number): string[] {
  const candidates = pool.filter(w => w !== correct);
  const picks = pickN(candidates, count);
  while (picks.length < count) picks.push('None of the above');
  return picks;
}

function makeItemsFromSentence(sentence: string, globalPool: string[], n: number): MCQItem[] {
  const localPool = extractKeywords(sentence);
  const usablePool = localPool.length ? localPool : globalPool;
  const items: MCQItem[] = [];

  for (let k = 0; k < n; k++) {
    const correct = usablePool[(k) % Math.max(1, usablePool.length)] ?? 'concept';
    const distractors = makeDistractors(correct, globalPool, 3);
    const options = shuffle([correct, ...distractors]).slice(0, 4);
    const correctIndex = options.indexOf(correct);

    const stem = `Which of the following terms best relates to: "${sentence}"?`;

    items.push({
      id: crypto.randomUUID(),
      stem,
      options,
      correctIndex: Math.max(0, correctIndex),
    });
  }
  return items;
}

// unified handler used by both routes
async function handleGenerate(req: any, reply: any) {
  const parsed = GenerateItemsReqSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: parsed.error.flatten(),
      },
    });
  }

  const { chunks, count_objectives, items_per_objective } = parsed.data;
  const text = chunks.join(' ');
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return reply.status(400).send({
      error: { code: 'NO_CONTENT', message: 'Could not extract sentences from chunks' },
    });
  }

  const pool = extractKeywords(text);
  const nObj = Math.min(count_objectives, Math.max(1, sentences.length));
  const bases = pickN(sentences, nObj);

  const allItems: MCQItem[] = [];
  for (const s of bases) {
    allItems.push(...makeItemsFromSentence(s, pool, items_per_objective));
  }

  return reply.send({ items: allItems });
}

// =========================
// Routes
// =========================
app.get('/health', async () => ({ ok: true }));

// Spec name (current):
app.post('/api/items/generate', handleGenerate);
// Legacy/alt name used in comments:
app.post('/curator/auto-generate', handleGenerate);

// =========================
// Boot
// =========================
async function start() {
  try {
    const port = Number(process.env.PORT ?? 8080);
    await app.listen({ host: '0.0.0.0', port });
    app.log.info(`API listening on ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
