/**
 * Dev-only seeding & status endpoints.
 * No static imports to avoid esbuild/tsx parse quirks.
 */
/* eslint-disable @typescript-eslint/no-var-requires */

const core = require('../db/core'); // plans/modules/items

const DEMO_SLUG = 'demo-pack';

export async function registerDevRoutes(app: any) {
  // Enable in non-prod, or with explicit flag
  const enableDev = process.env.ENABLE_DEV_ROUTES === '1' || process.env.NODE_ENV !== 'production';
  if (!enableDev) return;

  // Seed status (works even without a DB wired in dev)
  app.get('/api/dev/seed-status', async (_req: any, reply: any) => {
    reply.header('x-api', 'dev-seed-status');
    const db: any = (app as any).db;
    if (!db?.select) {
      return { ok: true, db: false, counts: { plans: 0, modules: 0, items: 0, attempts: 0, review: 0 } };
    }
    const [pc] = await db.execute('select count(*)::int as c from plans');
    const [mc] = await db.execute('select count(*)::int as c from modules');
    const [ic] = await db.execute('select count(*)::int as c from items');
    const [ac] = await db.execute('select count(*)::int as c from attempts');
    const [rc] = await db.execute('select count(*)::int as c from review_schedule');
    return { ok: true, db: true, counts: { plans: pc.c, modules: mc.c, items: ic.c, attempts: ac.c, review: rc.c } };
  });

  // seed route moved to registerDevSeed to avoid duplication
}


/* Dev migrations runner: POST /api/dev/migrate (idempotent, gated) */
const fs = require('fs');
const path = require('path');

module.exports.registerDevMigrate = async function registerDevMigrate(app) {
  if (!process.env.ENABLE_DEV_ROUTES) return;
  app.get('/api/dev/migrations', async (_req, reply) => {
    const dir = path.join(__dirname, '..', '..', 'migrations');
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort() : [];
    reply.header('x-api','dev-migrations'); return { ok:true, files };
  });

  app.post('/api/dev/migrate', async (_req, reply) => {
    const db = (app && app.db) || null;
    if (!db || !db.execute) return { ok:false, db:false, applied:[] };

    const dir = path.join(__dirname, '..', '..', 'migrations');
    if (!fs.existsSync(dir)) return { ok:true, db:true, applied:[] };

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
    const applied = [];
    try {
      await db.execute('begin', []);
      for (const f of files) {
        const sql = fs.readFileSync(path.join(dir, f), 'utf8');
        if (sql && sql.trim()) { await db.execute(sql, []); applied.push(f); }
      }
      await db.execute('commit', []);
      reply.header('x-api','dev-migrate'); return { ok:true, db:true, applied };
    } catch (e) {
      try { await db.execute('rollback', []); } catch {}
      return { ok:false, db:true, error:String(e), applied };
    }
  });
};


/* Seed DB with a demo plan/modules/items (idempotent). Gated by ENABLE_DEV_ROUTES */
module.exports.registerDevSeed = async function registerDevSeed(app) {
  if (!process.env.ENABLE_DEV_ROUTES) return;
  app.post('/api/dev/seed', async (_req, reply) => {
    const db = app.db;
    if (!db?.execute) return reply.send({ ok:false, db:false, seeded:false });
    // minimal demo seed
    const u = await db.execute(`insert into users(email) values('demo@cerply.dev')
      on conflict (email) do update set last_seen_at=now()
      returning id`);
    const userId = u[0].id;
    const p = await db.execute(`insert into plans(user_id, brief, status) values($1,'Demo Pack','active')
      returning id`, [userId]);
    const planId = p[0].id;
    const m = await db.execute(`insert into modules(plan_id,title,"order") values
      ($1,'Getting Started',1), ($1,'Practice MCQs',2)
      returning id`, [planId]);
    const m1 = m[0].id, m2 = m[1].id;
    await db.execute(`insert into items(module_id,type,stem,options,answer,explainer) values
      ($1,'explainer','Welcome to Cerply!','[]',0,'This is a demo explainer.'),
      ($2,'mcq','Which option matches #2?', '["A","B","C","D"]', 1, null)`, [m1, m2]);
    return { ok:true, db:true, planId };
  });
};

