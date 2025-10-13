import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { readSession } from './auth';
import { readSSOSession } from './sso';
import { attempts, reviewSchedule } from '../db/learner';
import { and, eq } from 'drizzle-orm';
import { validateFreeTextAnswer } from '../services/free-text-validator';
import { recordAttemptForAdaptive, DifficultyLevel } from '../services/adaptive';

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
  answerText?: string | null;  // Epic 8: Free-text answer support
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

export async function registerLearnRoutes(app: FastifyInstance & { db?: any }) {
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
        const it: any = rows[0];
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
    const item = items.find(i => i.id === due.itemId);
    if (!item) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'No item available' } });
    }

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
    let item = items.find(i => i.id === body.itemId);
    let correct = false;
    let partialCredit: number | undefined;
    let feedback: string | undefined;
    let validationMethod: string | undefined;
    
    // Epic 8: Free-text answer validation
    const FF_FREE_TEXT_ANSWERS_V1 = process.env.FF_FREE_TEXT_ANSWERS_V1 === 'true';
    if (FF_FREE_TEXT_ANSWERS_V1 && body.answerText && body.answerText.trim().length > 0) {
      try {
        // Get canonical answer
        let canonicalAnswer = '';
        if (item && item.options && typeof item.answerIndex === 'number') {
          canonicalAnswer = item.options[item.answerIndex] || '';
        } else {
          try {
            const db = (app as any)?.db;
            if (db && db.execute) {
              const row = await db.execute('select answer, options from items where id = $1 limit 1', [body.itemId]).then((r: any) => r && r[0]);
              if (row) {
                const opts = Array.isArray(row.options) ? row.options : (row.options?.values || []);
                const ansIdx = typeof row.answer === 'number' ? row.answer : 0;
                canonicalAnswer = opts[ansIdx] || '';
              }
            }
          } catch {}
        }

        if (canonicalAnswer) {
          const validation = await validateFreeTextAnswer(body.answerText, canonicalAnswer, item?.stem || '');
          correct = validation.correct;
          partialCredit = validation.partialCredit;
          feedback = validation.feedback;
          validationMethod = validation.method;
          reply.header('x-validation-method', validation.method);
        }
      } catch (err) {
        console.error('[learn] Free-text validation error:', err);
        // Fall back to incorrect if validation fails
        correct = false;
        partialCredit = 0.0;
        feedback = 'Unable to validate your answer. Please try again.';
        validationMethod = 'error';
      }
    } else if (typeof body.answerIndex === 'number') {
      // Original MCQ validation
      validationMethod = 'mcq';
      if (item) {
        correct = body.answerIndex === item.answerIndex;
      } else {
        try {
          const db = (app as any)?.db;
          if (db && db.execute) {
            const row = await db.execute('select answer from items where id = $1 limit 1', [body.itemId]).then((r: any) => r && r[0]);
            const ans = (row && typeof row.answer === 'number') ? row.answer : null;
            if (ans !== null) correct = Number(body.answerIndex) === ans;
          }
        } catch {}
      }
    }
    const tMs = body.responseTimeMs ?? null;

    
    let _dbAttempted = false;
    let _dbScheduled = false;
    
    try {
      const db = (app && app.db) || null;
      if (db && db.execute) {
        // persist attempt (Epic 8: includes free-text fields)
        try {
          await db.execute(
            `insert into attempts(user_id,item_id,answer_index,answer_text,correct,time_ms,partial_credit,feedback,validation_method)
             values (null,$1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              body.itemId, 
              body.answerIndex ?? null, 
              body.answerText ?? null,
              correct ? 1 : 0, 
              body.responseTimeMs ?? null,
              partialCredit ?? null,
              feedback ?? null,
              validationMethod ?? null
            ]
          );
          _dbAttempted = true;
        } catch {}

        // upsert simple schedule
        try {
          const prevRow = await db.execute(
            `select strength_score::int as s from review_schedule where item_id = $1 and user_id is null limit 1`,
            [body.itemId]
          );
          const prev = (prevRow && prevRow[0] && prevRow[0].s) || 300;
          const s = Math.max(0, Math.min(1000, correct ? prev + Math.round((1000 - prev) * 0.25) : Math.round(prev * 0.6)));
          const days = s >= 800 ? 21 : s >= 600 ? 7 : s >= 400 ? 3 : 1;
          const nextAt = new Date(Date.now() + days * 86400e3);

          await db.execute(`delete from review_schedule where item_id = $1 and user_id is null`, [body.itemId]);
          await db.execute(
            `insert into review_schedule(item_id, user_id, next_at, strength_score) values ($1, null, $2, $3)`,
            [body.itemId, nextAt, s]
          );
          _dbScheduled = true;
        } catch {}
      }
    } catch {}
    
    // expose DB effects as headers for acceptance
    reply.header('x-learn-attempt-db', _dbAttempted ? '1' : '0');
    reply.header('x-learn-db-scheduled', _dbScheduled ? '1' : '0');

    // Epic 9: Record attempt for adaptive difficulty tracking
    const FF_ADAPTIVE_DIFFICULTY_V1 = process.env.FF_ADAPTIVE_DIFFICULTY_V1 === 'true';
    if (FF_ADAPTIVE_DIFFICULTY_V1 && _dbAttempted) {
      try {
        const ssoSession = readSSOSession(req);
        if (ssoSession && ssoSession.userId) {
          // Get topicId from questionId by joining through quiz/module/topic hierarchy
          const db: any = (app as any).db;
          if (db && db.execute) {
            const topicRow = await db.execute(
              `SELECT m.topic_id, qq.difficulty_level
               FROM questions qq
               JOIN quizzes qz ON qq.quiz_id = qz.id
               JOIN modules_v2 m ON qz.module_id = m.id
               WHERE qq.id = $1
               LIMIT 1`,
              [body.itemId]
            );
            
            if (topicRow && topicRow[0]) {
              const topicId = topicRow[0].topic_id;
              const difficulty = topicRow[0].difficulty_level || 'application';
              
              await recordAttemptForAdaptive(ssoSession.userId, topicId, {
                questionId: body.itemId,
                correct,
                partialCredit: partialCredit ?? undefined,
                responseTimeMs: body.responseTimeMs ?? undefined,
                difficultyLevel: difficulty as DifficultyLevel,
              });
            }
          }
        }
      } catch (adaptiveErr) {
        // Don't fail the request if adaptive tracking fails
        console.error('[learn] Adaptive tracking error:', adaptiveErr);
      }
    }

    // update schedule (memory)
    const schedKey = keyFor(userId, planId);
    const sched = SCHEDULE.get(schedKey) || [];
    let nextS: number | undefined;
    let nextAt: number | undefined;
    if (item) {
      const entry = sched.find(s => s.itemId === item.id)!;
      const prev = entry?.strength ?? 0.3;
      nextS = updateStrength(prev, !!correct, tMs);
      nextAt = Date.now() + nextIntervalMs(nextS);
      if (entry) { entry.strength = nextS; entry.nextAt = nextAt; }
      else { sched.push({ itemId: item.id, strength: nextS, nextAt: nextAt! }); }
      SCHEDULE.set(schedKey, sched);
    }

    // persist to in-memory attempts when no DB present
    try {
      const db: any = (app as any).db;
      if (!db?.execute && item) {
        const k = `${userId}|${planId}`;
        const list = ATTEMPTS.get(k) || [];
        list.push({ itemId: item.id, answerIndex: body.answerIndex, correct, timeMs: tMs, at: Date.now() });
        ATTEMPTS.set(k, list);
      }
    } catch {}

    try {
      const db: any = (app as any).db;
      if (db?.execute) {
        await db.execute(
          `insert into events(user_id, type, payload) values ($1,$2,$3)`,
          [null, 'learn.submit', { itemId: body?.itemId, correct, responseTimeMs: body?.responseTimeMs ?? null, planId: body?.planId || null }]
        );
      }
    } catch { /* ignore */ }

    return {
      ok: true,
      result: {
        correct,
        partialCredit: partialCredit !== undefined ? partialCredit : (correct ? 1.0 : 0.0),
        feedback,
        validationMethod,
        strength: typeof nextS === 'number' ? Number((nextS as number).toFixed(3)) : undefined,
        nextReviewAt: typeof nextAt === 'number' ? new Date(nextAt as number).toISOString() : undefined
      }
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
