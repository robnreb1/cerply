#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { MockPlanner } from '../src/planner/engines/mock';

const file = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'tests', 'fixtures', 'planner-eval.jsonl');
const lines = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/);
let ok = 0, total = 0;
for (const ln of lines) {
  if (!ln.trim()) continue;
  total++;
  const { topic, expect } = JSON.parse(ln);
  const out = await MockPlanner.generate({ topic });
  const titleOk = out.plan.title.startsWith(expect.titleStartsWith);
  const lenOk = out.plan.items.length >= expect.minItems;
  const firstOk = out.plan.items[0].id.startsWith(expect.firstIdStartsWith);
  if (titleOk && lenOk && firstOk) ok++;
  else process.exitCode = 1;
}
console.log(`planner:eval ${ok}/${total} passed`);

