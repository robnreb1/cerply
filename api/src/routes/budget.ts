/* /api/ledger/alarm → simple budget check over lookback window (DB-aware CJS) */
/* eslint-disable @typescript-eslint/no-explicit-any */
module.exports.registerBudgetAlarm = async function registerBudgetAlarm(app:any) {
  app.get('/api/ledger/alarm', async (req:any, reply:any) => {
    reply.header('x-api','ledger-alarm');
    const db:any = (app as any).db;
    const limit = Number(process.env.BUDGET_LIMIT_CENTS || 0);
    const hours = Number(process.env.BUDGET_LOOKBACK_HOURS || 24);
    if (!db?.execute || !limit) return { ok:true, db: !!db?.execute, enabled:false, limitCents:limit, windowHours:hours };

    const since = new Date(Date.now()-hours*3600e3);
    const total = await db.execute(
      `select coalesce(sum(cost_cents),0)::int as cents from gen_ledger where created_at >= $1`,
      [since]
    ).then((r:any)=> r[0]?.cents ?? 0);
    return { ok:true, db:true, enabled:true, limitCents:limit, windowHours:hours, totalCents: total, exceeds: total >= limit };
  });
};


