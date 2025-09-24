import { describe, it, expect } from 'vitest';
import { AdaptiveV1Planner } from '../src/planner/engines/adaptive-v1';
import fs from 'node:fs';
import path from 'node:path';

type Case = { topic: string; level: 'beginner'|'advanced'; goals: string[] };

const topics = ['Hashes', 'Trees'] as const;
const levels: Array<'beginner'|'advanced'> = ['beginner', 'advanced'];
const goalsMatrix: string[][] = [[], ['memory','practice'].slice(0,2), ['focus']];

function keyOf(c: Case): string {
  const g = c.goals.join('-') || 'none';
  return `${c.topic}_${c.level}_${g}`.replace(/[^a-z0-9_\-]/gi, '_');
}

describe('Adaptive planner golden fixtures', () => {
  const outDir = path.join(__dirname, 'fixtures', 'adaptive');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const topic of topics) {
    for (const level of levels) {
      for (const goals of [[/* 0 */], ['memory']]) {
        const c: Case = { topic, level, goals };
        const name = keyOf(c);

        it(`produces stable plan for ${name}`, async () => {
          const res = await AdaptiveV1Planner.generate(c);
          const { plan, provenance } = res;
          const j = { plan, provenance: { ...provenance } } as any;
          // ensure request_id-like fields aren't present; nothing to strip here but keep hook if added later

          const file = path.join(outDir, `${name}.json`);
          if (!fs.existsSync(file)) {
            fs.writeFileSync(file, JSON.stringify(j, null, 2));
          }
          const golden = JSON.parse(fs.readFileSync(file, 'utf8'));
          expect(j).toEqual(golden);
        });
      }
    }
  }
});


