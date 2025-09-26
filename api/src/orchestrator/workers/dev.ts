export type WorkerResult = { ok: boolean; notes?: string; artifacts?: Record<string, any> };

export async function runDevLog(step: { payload?: any }): Promise<WorkerResult> {
  return { ok: true, notes: `dev.log: ${JSON.stringify(step?.payload ?? {})}` };
}


