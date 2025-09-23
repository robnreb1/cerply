export type PlanRequest = { topic: string };
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

export async function postCertifiedPlan(baseUrl: string, body: PlanRequest, init?: RequestInit): Promise<{ status: number; json: PlanResponse | any; headers: Headers }>{
  const res = await fetch(`${baseUrl}/api/certified/plan`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
    body: JSON.stringify(body),
    ...init,
  });
  let json: any = {};
  try { json = await res.json(); } catch {}
  return { status: res.status, json, headers: res.headers };
}
