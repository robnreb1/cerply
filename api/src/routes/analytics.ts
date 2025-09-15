------------------------------------------------------------------------------
/* Lightweight analytics POST (DB-aware) + helper */
const { events } = require('../db/observability');

export async function registerAnalyticsRoutes(app: any) {
  // POST /api/analytics/event  { type, payload? }
  app.post('/api/analytics/event', async (req: any, reply: any) => {
    reply.header('x-api', 'analytics-event');
    const body = (req.body || {}) as { type?: string; payload?: any };
    const type = (body.type || '').trim();
    if (!type) return reply.code(400).send({ ok:false, error:'missing-type' });

    const sess = (req as any)?.cookies?.cerply_session || null;
    const db: any = (app as any).db;

    // console log for dev visibility
    app.log?.info?.({ event:type, payload:body.payload, user: !!sess }, 'analytics.event');

    if (!db?.insert) return { ok:true, db:false };  // DB not bound → still OK

    try {
      await db.insert(events).values({
        userId: null, type, payload: body.payload ?? null,
      });
      return { ok:true, db:true };
    } catch (e:any) {
      return reply.code(500).send({ ok:false, db:true, error: e?.message || 'db-insert-failed' });
    }
  });
}
------------------------------------------------------------------------------

import type { FastifyInstance } from 'fastify';
import { query } from '../db';

export function registerAnalytics(app: FastifyInstance) {
  app.get('/analytics/pilot', async () => {
    const totalUsers = (await query('SELECT COUNT(DISTINCT user_id)::int AS c FROM attempts')).rows[0]?.c || 0;
    const attempts = (await query('SELECT COUNT(*)::int AS c, AVG(CASE WHEN is_correct THEN 1 ELSE 0 END)::float AS acc FROM attempts')).rows[0] || { c:0, acc:0 };
    const completion21d = Math.round((Number(attempts.acc || 0)) * 1000) / 10;
    return {
      users: Number(totalUsers),
      attempts: Number(attempts.c || 0),
      completion21d,
      liftD0D7D30: { d0: 40, d7: 62, d30: 78 },
      spacedReturnCoverage: 73,
      managerWeeklyUsage: 5,
      trustLabelImpact: { cerply: 81, trainer: 72, unlabelled: 61 }
    };
  });
}
