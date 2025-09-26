import type { WorkerResult } from './dev';

export async function runCi(step: { payload?: any }): Promise<WorkerResult> {
  return { ok: true, notes: `ci.mock planned: ${JSON.stringify(step?.payload ?? {})}` };
}


