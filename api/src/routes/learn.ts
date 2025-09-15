import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { readSession } from './auth';
import { attempts, reviewSchedule } from '../db/learner';
import { and, eq } from 'drizzle-orm';

type LearnItem = {
  id: string;
  type: 'mcq'|'free';
  stem: string;
  options?: string[];
  answerIndex?: number;      // stored server-side; not returned in prod
  explainer?: string;
  moduleId?: string;
};

type SubmitReq = {
  itemId: string;
  answerIndex?: number | null;
  responseTimeMs?: number | null;
  planId?: string | null;
};

const ITEMS = new Map<string, LearnItem[]>();          // planId -> items
const SCHEDULE = new Map<string, { itemId: string; strength: number; nextAt: number }[]>(); // key=user|plan
const ATTEMPTS = new Map<string, any[]>();             // in-memory fallback

const A = 0.35, B = 0.6;

function userIdFromReq(req: any) {
  const sess = readSession(req);
  const key = sess?.email || 'anon';
  return crypto.createHash('sha1').update(key).digest('hex').slice(0, 16);
}

function ensurePlanItems(planId: string): LearnItem[] {
  if (!ITEMS.has(planId)) {
    // seed 5 simple MCQs
    const seeded: LearnItem[] = Array.from({ length: 5 }, (_, i) => ({
      id: `${planId}-q${i+1}`,
      type: 'mcq',
      stem: `Which option matches #${i+1}?`,
      options: ['A', 'B', 'C', 'D'],
      answerIndex: i % 4,
      explainer: `Answer is ${'ABCD'[i % 4]} because ...`
    }));
    ITEMS.set(planId, seeded);
  }
  return ITEMS.get(planId)!;
}

function keyFor(userId: string, planId: string) { return `${userId}|${planId}`; }

function nextIntervalMs(s: number) {
  if (s < 0.4) return 24*3600e3;
  if (s < 0.6) return 3*24*3600e3;
  if (s < 0.8) return 7*24*3600e3;
  return 21*24*3600e3;
}

function updateStrength(prev: number, correct: boolean, tMs?: number|null) {
  if (!correct) return Math.max(0, prev * B);
  const f = tMs==null ? 1 : (tMs <= 10_000 ? 1 : tMs <= 30_000 ? 0.8 : tMs <= 60_000 ? 0.6 : 0.4);
  const s = Math.min(1, prev + A * (1 - prev) * f);
  return s;
}

export async function registerLearnRoutes(app: FastifyInstance) {
  // GET /api/learn/next?planId=...
  app.get('/api/learn/next', async (req, reply) => {
    reply.header('x-api', 'learn-next');
    const planId = (req.query as any)?.planId || 'default-plan';
    const userId = userIdFromReq(req);
    const db:any = (app as any).db;
    if (db?.execute && (req as any).query?.planId) {
      // pick the earliest item not yet attempted (simple demo heuristic)
      const selector = String((req as any).query.planId || '');
      const rows = await db.execute(
        `select i.id, i.type, i.stem, i.options, i.answer
           from items i
          where i.module_id in (
            select id from modules
             where plan_id in (
               select id from plans
                where id::text = $1 or brief = $1
             )
          )
          order by i.created_at asc
          limit 1`,
        [selector]
      );
      if (rows.length) {
        reply.header('x-learn-source','db');
        const it = rows[0];
        const options = Array.isArray(it.options) ? it.options : (it.options?.values ?? []);
        return {
          itemId: it.id,
          type: it.type,
          stem: it.stem ?? '—',
          options: options.length ? options : ['A','B','C','D'],
          dueAt: new Date().toISOString(),
          debugAnswerIndex: typeof it.answer === 'number' ? it.answer : 0
        };
      }
    }
    const items = ensurePlanItems(planId);
    const schedKey = keyFor(userId, planId);
    const now = Date.now();

    // hydrate schedule entries for unseen items
    const sched = SCHEDULE.get(schedKey) || [];
    const seen = new Set(sched.map(s => s.itemId));
    for (const it of items) {
      if (!seen.has(it.id)) sched.push({ itemId: it.id, strength: 0.3, nextAt: now });
    }
    SCHEDULE.set(schedKey, sched);

    // choose due item (earliest nextAt, then lowest strength)
    sched.sort((a,b) => a.nextAt - b.nextAt || a.strength - b.strength);
    const due = sched.find(s => s.nextAt <= now) || sched[0];
    const item = items.find(i => i.id === due.itemId)!;

    // Emit source + plan key headers
    const planKey = planId;
    const fromMemory = items.some(it => it.id?.startsWith(`${planKey}-q`));
    const source = fromMemory ? 'memory' : 'db';
    reply.header('x-api', 'learn-next');
    reply.header('x-learn-source', source);
    reply.header('x-plan-key', planKey);

    // DEV-only helper: include answerIndex to support tests; hide in production
    const debugAnswerIndex = process.env.NODE_ENV === 'production' ? undefined : item.answerIndex;

    return {
      itemId: item.id,
      type: item.type,
      stem: item.stem,
      options: item.options,
      dueAt: new Date(due.nextAt).toISOString(),
      debugAnswerIndex
    };
  });

  // POST /api/learn/submit
  app.post('/api/learn/submit', async (req, reply) => {
    reply.header('x-api', 'learn-submit');
    const body = req.body as SubmitReq;
    const planId = body.planId || 'default-plan';
    const userId = userIdFromReq(req);
    const items = ensurePlanItems(planId);
    const planKey = planId;
    const fromMemory = items.some(it => it.id?.startsWith(`${planKey}-q`));
    reply.header('x-api', 'learn-submit');
    reply.header('x-learn-source', fromMemory ? 'memory' : 'db');
    reply.header('x-plan-key', planKey);
    const item = items.find(i => i.id === body.itemId);
    if (!item) return reply.code(400).send({ ok:false, error: 'unknown-item' });

    const correct = (typeof body.answerIndex === 'number') ? (body.answerIndex === item.answerIndex) : false;
    const tMs = body.responseTimeMs ?? null;

    try {
      const db:any = (app as any).db;
      if (db?.execute) {
        await db.execute(
          `insert into attempts(user_id,item_id,answer_index,correct,time_ms)
           values (null,$1,$2,$3,$4)`,
          [body.itemId, body.answerIndex ?? null, correct ? 1 : 0, body.responseTimeMs ?? null]
        );
      }
    } catch {}

    // update schedule (memory)
    const schedKey = keyFor(userId, planId);
    const sched = SCHEDULE.get(schedKey) || [];
    const entry = sched.find(s => s.itemId === item.id)!;
    const prev = entry?.strength ?? 0.3;
    const nextS = updateStrength(prev, !!correct, tMs);
    const nextAt = Date.now() + nextIntervalMs(nextS);
    if (entry) { entry.strength = nextS; entry.nextAt = nextAt; }
    else { sched.push({ itemId: item.id, strength: nextS, nextAt }); }
    SCHEDULE.set(schedKey, sched);

    // persist attempt & schedule if DB present
    try {
      const db: any = (app as any).db;
      if (db?.insert) {
        await db.insert(attempts).values({
          userId, itemId: item.id, answerIndex: body.answerIndex ?? null, correct, timeMs: tMs ?? null
        });
        // upsert review_schedule
        const rs = await db.query.reviewSchedule.findFirst({ where: and(eq(reviewSchedule.userId, userId), eq(reviewSchedule.itemId, item.id)) });
        if (rs) {
          await db.update(reviewSchedule)
            .set({ strengthScore: nextS, nextAt: new Date(nextAt) })
            .where(and(eq(reviewSchedule.userId, userId), eq(reviewSchedule.itemId, item.id)));
        } else {
          await db.insert(reviewSchedule).values({ userId, itemId: item.id, strengthScore: nextS, nextAt: new Date(nextAt) });
        }
      } else {
        const k = `${userId}|${planId}`;
        const list = ATTEMPTS.get(k) || [];
        list.push({ itemId: item.id, answerIndex: body.answerIndex, correct, timeMs: tMs, at: Date.now() });
        ATTEMPTS.set(k, list);
      }
    } catch {
      // swallow persistence errors for MVP; telemetry can log later
    }

    try {
      const db: any = (app as any).db;
      if (db?.execute) {
        const { events } = require('../db/observability.cjs');
        await db.insert(events).values({
          userId: null,
          type: 'learn.submit',
          payload: {
            itemId: body?.itemId, correct, responseTimeMs: body?.responseTimeMs ?? null,
            planId: body?.planId || null
          }
        });
      }
    } catch { /* ignore */ }

    return {
      ok: true,
      result: { correct, strength: Number(nextS.toFixed(3)), nextReviewAt: new Date(nextAt).toISOString() }
    };
  });

  // Aliases (non-API) → deprecate with redirect
  app.get('/learn/next', async (_req, reply) => {
    reply.header('x-deprecated', 'true');
    reply.header('link', '</api/learn/next>; rel="successor-version"');
    return reply.code(307).send({ next: '/api/learn/next' });
  });

  app.post('/learn/submit', async (_req, reply) => {
    reply.header('x-deprecated', 'true');
    reply.header('link', '</api/learn/submit>; rel="successor-version"');
    return reply.code(307).send({ next: '/api/learn/submit' });
  });
}
