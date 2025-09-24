import fs from 'node:fs';
import path from 'node:path';
import createApp from '../src/index';

type Row = { topic: string; level?: 'beginner'|'intermediate'|'advanced'; goals?: string[] };

async function main() {
  const app = await createApp();
  try {
    const datasetPath = path.join(__dirname, '..', 'tests', 'fixtures', 'planner-eval.jsonl');
    const outPath = path.join(__dirname, '..', 'tests', 'fixtures', 'planner-eval.multiphase.json');
    const lines = fs.readFileSync(datasetPath, 'utf8').split(/\r?\n/).filter(Boolean);
    const rows: Row[] = lines.map((l) => { try { return JSON.parse(l); } catch { return { topic: String(l) }; } });

    const enabledEnv = {
      CERTIFIED_ENABLED: 'true',
      CERTIFIED_MODE: 'plan',
      FF_ADAPTIVE_ENGINE_V1: process.env.FF_ADAPTIVE_ENGINE_V1 ?? 'true',
      FF_OPENAI_ADAPTER_V0: process.env.FF_OPENAI_ADAPTER_V0 ?? 'true',
      FF_CERTIFIED_PROPOSERS: 'true',
      FF_CERTIFIED_CHECKER: 'true',
      FF_CERTIFIED_LOCK: 'false',
      CERTIFIED_PROPOSERS: process.env.CERTIFIED_PROPOSERS ?? 'adaptive,openai',
    };

    const results: any[] = [];
    let withCitations = 0;
    let total = 0;
    let sameHash = 0;

    for (const row of rows.slice(0, 20)) {
      total += 1;
      const r = await app.inject({
        method: 'POST',
        url: '/api/certified/plan',
        headers: { 'content-type': 'application/json', ...enabledEnv },
        payload: { topic: row.topic, level: row.level, goals: row.goals }
      });
      const j = r.json() as any;
      const citations = Array.isArray(j?.citations) ? j.citations.length : 0;
      if (citations > 0) withCitations += 1;
      const planLen = Array.isArray(j?.plan?.items) ? j.plan.items.length : 0;
      results.push({ topic: row.topic, citations, planLen, engines: r.headers['x-provenance-engines'] || '' });

      // determinism check: call again and compare canonical plan JSON
      const r2 = await app.inject({ method: 'POST', url: '/api/certified/plan', headers: { 'content-type': 'application/json', ...enabledEnv }, payload: { topic: row.topic, level: row.level, goals: row.goals } });
      const j2 = r2.json() as any;
      if (JSON.stringify(j?.plan) === JSON.stringify(j2?.plan)) sameHash += 1;
    }

    const coveragePct = total ? Math.round((withCitations / total) * 100) : 0;
    const determinismPct = total ? Math.round((sameHash / total) * 100) : 0;
    const summary = { total, coveragePct, determinismPct, results };
    fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
    console.log('planner-eval.multiphase written:', outPath);
  } finally {
    await app.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });


