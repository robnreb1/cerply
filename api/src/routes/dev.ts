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


/* Idempotent seed + status */
module.exports.registerDevSeed = async function registerDevSeed(app) {
  if (!process.env.ENABLE_DEV_ROUTES) return;

  app.get('/api/dev/seed-status', async (_req, reply) => {
    const db = app.db;
    if (!db?.execute) return { ok:false, db:false };
    const q = async (sql,args)=> (await db.execute(sql,args))[0]?.count || 0;
    const plans = await q('select count(*)::int as count from plans',[]);
    const modules = await q('select count(*)::int as count from modules',[]);
    const items = await q('select count(*)::int as count from items',[]);
    reply.header('x-api','dev-seed-status');
    return { ok:true, db:true, counts:{ plans, modules, items } };
  });

  app.post('/api/dev/seed', async (_req, reply) => {
    const db = app.db;
    if (!db?.execute) return { ok:false, db:false, seeded:false };

    // user upsert
    const u = await db.execute(
      `insert into users(email) values('demo@cerply.dev')
       on conflict (email) do update set last_seen_at=now()
       returning id`, []
    );
    const userId = u[0].id;

    // ensure a single demo plan
    const p = await db.execute(
      `insert into plans(user_id, brief, status)
       values($1,'Demo Pack','active')
       on conflict do nothing
       returning id`,
      [userId]
    );
    const planId = p[0]?.id || (await db.execute(
      `select id from plans where brief='Demo Pack' and user_id=$1 limit 1`, [userId]
    ))[0]?.id;

    // modules (idempotent by title+plan)
    await db.execute(
      `insert into modules(plan_id,title,"order")
       values ($1,'Getting Started',1) on conflict do nothing`, [planId]
    );
    await db.execute(
      `insert into modules(plan_id,title,"order")
       values ($1,'Practice MCQs',2) on conflict do nothing`, [planId]
    );

    const m1 = (await db.execute(
      `select id from modules where plan_id=$1 and title='Getting Started' limit 1`, [planId]
    ))[0].id;
    const m2 = (await db.execute(
      `select id from modules where plan_id=$1 and title='Practice MCQs' limit 1`, [planId]
    ))[0].id;

    // items (idempotent by module+stem)
    await db.execute(
      `insert into items(module_id,type,stem,options,answer,explainer)
       values ($1,'explainer','Welcome to Cerply!','[]',0,'This is a demo explainer.')
       on conflict do nothing`, [m1]
    );
    await db.execute(
      `insert into items(module_id,type,stem,options,answer,explainer)
       values ($1,'mcq','Which option matches #2?','["A","B","C","D"]',1,null)
       on conflict do nothing`, [m2]
    );

    reply.header('x-api','dev-seed'); return { ok:true, db:true, seeded:true, planId };
  });
};

/* Backfill review_schedule for items lacking entries */
module.exports.registerDevBackfill = async function registerDevBackfill(app) {
  if (!process.env.ENABLE_DEV_ROUTES) return;
  app.post('/api/dev/backfill/reviews', async (_req, reply) => {
    const db = app.db;
    if (!db?.execute) return { ok:false, db:false, created:0 };
    // naive: one review per item without schedule, due tomorrow
    const rows = await db.execute(
      `with missing as (
         select i.id as item_id from items i
         left join review_schedule r on r.item_id=i.id
         where r.id is null
       )
       insert into review_schedule(item_id, user_id, next_at, strength_score)
       select item_id, null, now() + interval '1 day', 300 from missing
       returning id`,
       []
    );
    reply.header('x-api','dev-backfill');
    return { ok:true, db:true, created:(rows||[]).length };
  });
};

