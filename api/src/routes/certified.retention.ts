import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ScheduleRequestZ, ScheduleResponseZ, ProgressEventZ, ProgressSnapshotZ } from '../schemas/certified.retention';
import { sm2Update, nextDue } from '../planner/engines/sm2-lite';

function enabled() {
  return String(process.env.CERTIFIED_ENABLED || 'false').toLowerCase() === 'true'
      && String(process.env.RETENTION_ENABLED || 'false').toLowerCase() === 'true';
}

// Preview-only in-memory store; process-lifetime only
const SNAPSHOTS = new Map<string, z.infer<typeof ProgressSnapshotZ>>();

export async function registerCertifiedRetentionRoutes(app: FastifyInstance) {
  // POST /api/certified/schedule
  app.post('/api/certified/schedule', { config: { public: true } }, async (req: FastifyRequest, reply: FastifyReply) => {
    const ct = String((req.headers as any)['content-type'] || '').toLowerCase();
    if (!ct.includes('application/json')) {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(415).send({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Expected content-type: application/json' } });
    }
    if (!enabled()) {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(503).send({ error: { code: 'CERTIFIED_DISABLED', message: 'Retention preview disabled' } });
    }
    const parsed = ScheduleRequestZ.safeParse(((req as any).body ?? {}) as any);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Invalid schedule payload' } });
    }
    const { session_id, plan_id, items, prior, now } = parsed.data;
    const nowISO = now ?? new Date().toISOString();

    // Build snapshot starting from prior
    const prev = SNAPSHOTS.get(session_id)?.items ?? [];
    const prevMap = new Map(prev.map(p => [p.card_id, p]));
    const priorList = Array.isArray(prior) ? prior : [];
    for (const p of priorList) prevMap.set(p.card_id, p);

    const snapshotItems = items.map((c) => {
      const cur = prevMap.get(c.id) ?? { card_id: c.id, reps: 0, ef: 2.5, intervalDays: 0, dueISO: nowISO };
      // keep current due unless in the past
      const dueISO = new Date(cur.dueISO).getTime() <= new Date(nowISO).getTime() ? nowISO : cur.dueISO;
      return { ...cur, dueISO };
    });

    // Order: due soonest first, then by id for determinism
    const order = [...snapshotItems]
      .sort((a,b) => (new Date(a.dueISO).getTime() - new Date(b.dueISO).getTime()) || String(a.card_id).localeCompare(String(b.card_id)))
      .map(x => x.card_id);

    const resp = { session_id, plan_id, order, due: nowISO, meta: { algo: 'sm2-lite' as const, version: 'v0' as const } };
    try { ScheduleResponseZ.parse(resp); } catch {
      return reply.code(500).send({ error: { code: 'INTERNAL', message: 'schedule schema validation failed' } });
    }
    SNAPSHOTS.set(session_id, { session_id, items: snapshotItems });

    reply.header('access-control-allow-origin', '*');
    reply.removeHeader('access-control-allow-credentials');
    reply.header('cache-control', 'no-store');
    return reply.send(resp);
  });

  // POST /api/certified/progress (event)
  app.post('/api/certified/progress', { config: { public: true } }, async (req: FastifyRequest, reply: FastifyReply) => {
    const ct = String((req.headers as any)['content-type'] || '').toLowerCase();
    if (!ct.includes('application/json')) {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(415).send({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Expected content-type: application/json' } });
    }
    if (!enabled()) {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(503).send({ error: { code: 'CERTIFIED_DISABLED', message: 'Retention preview disabled' } });
    }
    const parsed = ProgressEventZ.safeParse(((req as any).body ?? {}) as any);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Invalid progress event' } });
    }
    const { session_id, card_id, action, grade, at } = parsed.data;
    const nowISO = at;
    const snap = SNAPSHOTS.get(session_id);
    if (!snap) {
      // initialize empty snapshot with this card only
      SNAPSHOTS.set(session_id, { session_id, items: [] });
    }
    const current = SNAPSHOTS.get(session_id)!;
    const idx = current.items.findIndex(x => x.card_id === card_id);
    const entry = idx >= 0 ? current.items[idx] : { card_id, reps: 0, ef: 2.5, intervalDays: 0, lastGrade: undefined as any, dueISO: nowISO };

    let next = entry;
    if (action === 'reset') {
      next = { card_id, reps: 0, ef: 2.5, intervalDays: 0, lastGrade: undefined, dueISO: nowISO };
    } else if (action === 'flip') {
      // No state change except ensure due not in the past
      next = { ...entry, dueISO: new Date(entry.dueISO).getTime() <= new Date(nowISO).getTime() ? nowISO : entry.dueISO };
    } else if (action === 'grade') {
      const updated = sm2Update({ reps: entry.reps, ef: entry.ef, intervalDays: entry.intervalDays, lastGrade: entry.lastGrade }, Number(grade ?? 0));
      next = { card_id, reps: updated.reps, ef: updated.ef, intervalDays: updated.intervalDays, lastGrade: updated.lastGrade, dueISO: nextDue(nowISO, updated.intervalDays) };
    }

    if (idx >= 0) current.items[idx] = next; else current.items.push(next);
    SNAPSHOTS.set(session_id, current);

    reply.header('access-control-allow-origin', '*');
    reply.removeHeader('access-control-allow-credentials');
    reply.header('cache-control', 'no-store');
    return reply.send({ ok: true });
  });

  // GET /api/certified/progress?sid=
  app.get('/api/certified/progress', { config: { public: true } }, async (req: FastifyRequest, reply: FastifyReply) => {
    if (!enabled()) {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(503).send({ error: { code: 'CERTIFIED_DISABLED', message: 'Retention preview disabled' } });
    }
    const q = (req as any).query as { sid?: string };
    const sid = String(q?.sid || '').trim();
    if (!sid) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'sid required' } });
    const snap = SNAPSHOTS.get(sid) ?? { session_id: sid, items: [] };
    try { ProgressSnapshotZ.parse(snap); } catch {
      return reply.code(500).send({ error: { code: 'INTERNAL', message: 'snapshot invalid' } });
    }
    reply.header('access-control-allow-origin', '*');
    reply.removeHeader('access-control-allow-credentials');
    reply.header('cache-control', 'no-store');
    return reply.send(snap);
  });
}
