import fs from 'node:fs';
import path from 'node:path';
import { MockPlanner } from '../src/planner/engines/mock';

async function main() {
  const file = path.join(__dirname, '..', 'tests', 'fixtures', 'planner-eval.jsonl');
  const raw = fs.readFileSync(file, 'utf8');
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  let ok = 0;
  let total = 0;
  for (const ln of lines) {
    total++;
    const { topic, expect } = JSON.parse(ln);
    const out = await MockPlanner.generate({ topic });
    const titleOk = String(out.plan.title || '').startsWith(expect.titleStartsWith);
    const lenOk = Array.isArray(out.plan.items) && out.plan.items.length >= (expect.minItems || 1);
    const firstOk = String(out.plan.items?.[0]?.id || '').startsWith(expect.firstIdStartsWith);
    if (titleOk && lenOk && firstOk) ok++; else process.exitCode = 1;
  }
  // eslint-disable-next-line no-console
  console.log(`planner:eval ${ok}/${total} passed`);
}

main().catch((e) => { console.error(e); process.exit(1); });


