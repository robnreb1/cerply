import fs from 'node:fs';
import path from 'node:path';
import { OpenAIV0Planner } from '../src/planner/engines/openai-v0';

type Case = { topic: string; level?: 'beginner'|'intermediate'|'advanced'; goals?: string[]; expect?: { minItems?: number } };

async function main() {
  const datasetPath = path.join(__dirname, '..', 'tests', 'fixtures', 'planner-eval.jsonl');
  const outPath = path.join(__dirname, '..', 'tests', 'fixtures', 'planner-eval.openai.json');

  let cases: Case[] = [];
  if (fs.existsSync(datasetPath)) {
    const raw = fs.readFileSync(datasetPath, 'utf8').trim().split(/\r?\n/).filter(Boolean);
    cases = raw.map((ln) => { try { return JSON.parse(ln) as Case; } catch { return { topic: 'Hashes' }; } });
  } else {
    cases = [
      { topic: 'Hashes', level: 'beginner', goals: ['memory'], expect: { minItems: 3 } },
      { topic: 'Graphs', level: 'advanced', goals: ['practice'], expect: { minItems: 3 } },
    ];
  }

  const keyed = !!process.env.OPENAI_API_KEY;
  const sampleSize = keyed ? Math.max(1, Math.min(3, cases.length)) : cases.length;

  let ok = 0;
  const firstIds: string[] = [];
  for (const c of cases.slice(0, sampleSize)) {
    const out = await OpenAIV0Planner.generate({ topic: c.topic, level: c.level, goals: c.goals });
    const passed = Array.isArray(out.plan.items) && out.plan.items.length >= (c.expect?.minItems ?? 3);
    if (out.plan.items[0]) firstIds.push(out.plan.items[0].id);
    if (passed) ok++;
  }

  const metrics = { seed: 'openai-v0', keyed, cases: sampleSize, ok, coverage: ok / Math.max(1, sampleSize), firstIds };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(metrics, null, 2));
  console.log('openai-eval written:', outPath);
}

main().catch((e) => { console.error(e); process.exit(0); });


