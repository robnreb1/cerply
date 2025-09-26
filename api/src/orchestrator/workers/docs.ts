import type { WorkerResult } from './dev';

export async function runDocs(step: { payload?: any }): Promise<WorkerResult> {
  return { ok: true, notes: `docs.mock planned: ${JSON.stringify(step?.payload ?? {})}` };
}


