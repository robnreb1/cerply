export type CertifiedPlanItem = { id: string; type: string; front?: string; back?: string };
export type CertifiedPlanResponse = {
  status: 'ok'|'stub'|string;
  endpoint?: string;
  mode?: string;
  enabled?: boolean;
  request_id?: string;
  provenance?: { planner?: string; proposers?: string[]; checker?: string };
  plan?: { title?: string; items?: CertifiedPlanItem[] };
};

export function pickPreviewTitle(resp: CertifiedPlanResponse): string {
  if (resp?.status === 'ok' && resp?.plan?.title) return String(resp.plan.title);
  if (resp?.status === 'stub') return 'Certified (stub mode)';
  return 'Certified';
}
