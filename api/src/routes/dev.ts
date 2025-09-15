------------------------------------------------------------------------------
import { FastifyInstance } from 'fastify';
import * as core from '../db/core';
import { attempts, reviewSchedule } from '../db/learner';

const DEMO_SLUG = 'demo-pack';

export async function registerDevRoutes(app: FastifyInstance) {
  // Only expose in non-production
  if (process.env.NODE_ENV === 'production') return;

  app.get('/api/dev/seed-status', async (_req, reply) => {
    reply.header('x-api', 'dev-seed-status');
    const db: any = (app as any).db;
    if (!db?.select) {
      return { ok: true, db: false, counts: { plans: 0, modules: 0, items: 0, attempts: 0, review: 0 } };
    }
    const [pc] = await db.execute<any>("select count(*)::int as c from plans");
    const [mc] = await db.execute<any>("select count(*)::int as c from modules");
    const [ic] = await db.execute<any>("select count(*)::int as c from items");
    const [ac] = await db.execute<any>("select count(*)::int as c from attempts");
    const [rc] = await db.execute<any>("select count(*)::int as c from review_schedule");
    return { ok: true, db: true, counts: { plans: pc.c, modules: mc.c, items: ic.c, attempts: ac.c, review: rc.c } };
  });

  app.post('/api/dev/seed', async (_req, reply) => {
    reply.header('x-api', 'dev-seed');
    const db: any = (app as any).db;
    if (!db?.insert) {
      return reply.code(200).send({ ok: true, db: false, note: 'No DB in dev; skipped seeding.' });
    }

    // Idempotent upsert by slug
    const existing = await db.query.plans.findFirst({ where: (p: any, { eq }: any) => eq(p.slug, DEMO_SLUG) });
    let planId: string;
    if (existing) {
      planId = existing.id;
    } else {
      const [p] = await db.insert(core.plans).values({ brief: 'Demo Pack', status: 'active', slug: DEMO_SLUG }).returning({ id: core.plans.id });
      planId = p.id;
    }

    // Minimal 3 modules
    const moduleTitles = ['Foundations', 'Core Techniques', 'Applied Practice'];
    const modIds: string[] = [];
    for (let i = 0; i < moduleTitles.length; i++) {
      const title = moduleTitles[i];
      const row = await db.query.modules.findFirst({ where: (m: any, { and, eq }: any) => and(eq(m.planId, planId), eq(m.title, title)) });
      if (row) { modIds.push(row.id); continue; }
      const [m] = await db.insert(core.modules).values({ planId, title, order: i + 1 }).returning({ id: core.modules.id });
      modIds.push(m.id);
    }

    // 10 items (mcq) spread across modules
    for (let i = 0; i < 10; i++) {
      const mid = modIds[i % modIds.length];
      const stem = `Demo question #${i + 1}`;
      const existingItem = await db.execute<any>(
        "select id from items where module_id=$1 and stem=$2 limit 1",
        [mid, stem]
      ).then((r: any) => r[0]);
      if (existingItem) continue;
      await db.insert(core.items).values({
        moduleId: mid,
        type: 'mcq',
        stem,
        options: JSON.stringify(['A','B','C','D']),
        answer: i % 4,
        explainer: `Answer is ${'ABCD'[i % 4]} because ...`
      });
    }

    return { ok: true, planId, modules: modIds.length, items: 10 };
  });
}
------------------------------------------------------------------------------

