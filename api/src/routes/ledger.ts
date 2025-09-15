/* /api/ledger/totals → sum by model and grand total (DB-aware, CJS export) */
module.exports.registerLedgerRoutes = async function registerLedgerRoutes(app: any) {
  app.get('/api/ledger/totals', async (req: any, reply: any) => {
    reply.header('x-api', 'ledger-totals');
    const db: any = (app as any).db;
    if (!db?.execute) return { ok: false, db: false, totals: [] };

    // (lazy require kept for symmetry, not used directly here)
    require('../db/observability');

    const q: any = req.query || {};
    const from = q.from ? new Date(String(q.from)) : null;
    const to = q.to ? new Date(String(q.to)) : null;

    let where = '';
    const args: any[] = [];
    if (from) { args.push(from); where += (where ? ' AND ' : '') + `created_at >= $${args.length}`; }
    if (to)   { args.push(to);   where += (where ? ' AND ' : '') + `created_at <  $${args.length}`; }

    const byModel = await db.execute(
      `select model_used as model, coalesce(sum(cost_cents),0)::int as cents
       from gen_ledger ${where ? 'where ' + where : ''} group by model_used order by model_used`, args
    );

    const total = await db.execute(
      `select coalesce(sum(cost_cents),0)::int as cents from gen_ledger ${where ? 'where ' + where : ''}`, args
    ).then((r: any) => r[0]?.cents ?? 0);

    return { ok: true, db: true, totals: byModel, totalCents: total };
  });
};
