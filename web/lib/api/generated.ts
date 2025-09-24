export type PlanRequest = { topic: string; level?: 'beginner'|'intermediate'|'advanced'; goals?: string[] };
export type PlanItem = { id: string; type: 'card'; front: string; back: string };
export type PlanResponse = {
  status: 'ok';
  request_id: string;
  endpoint: 'certified.plan';
  mode: 'plan' | 'mock';
  enabled: boolean;
  provenance: { planner: string; proposers: string[]; checker: string };
  plan: { title: string; items: PlanItem[] };
};

export async function postCertifiedPlan(
  baseUrl: string,
  body: PlanRequest,
  init?: RequestInit
): Promise<{ status: number; json: PlanResponse | any; headers: Headers }>{
  const maxRetries = 2;
  const baseDelay = 250;
  let lastError: any = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${baseUrl}/api/certified/plan`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
        body: JSON.stringify(body),
        signal: controller.signal,
        ...init,
      });
      clearTimeout(timeout);
      let json: any = {};
      try { json = await res.json(); } catch {}
      if (res.status >= 500 && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)));
        continue;
      }
      return { status: res.status, json, headers: res.headers };
    } catch (e) {
      lastError = e;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)));
        continue;
      }
      throw e;
    }
  }
  throw lastError ?? new Error('postCertifiedPlan failed');
}
