export type CertifiedPlanItem = { id: string; type: string; front?: string; back?: string };
export type CertifiedPlanResponse = {
  status: 'ok'|'stub'|string;
  endpoint?: string;
  mode?: string;
  enabled?: boolean;
  request_id?: string;
  provenance?: { planner?: string; proposers?: string[]; checker?: string };
  citations?: Array<{ id: string; url: string; title?: string }>;
  lock?: { algo: 'blake3'|'sha256'; hash: string; canonical_bytes: number };
  plan?: { title?: string; items?: CertifiedPlanItem[] };
};

export function pickPreviewTitle(resp: CertifiedPlanResponse): string {
  if (resp?.status === 'ok' && resp?.plan?.title) return String(resp.plan.title);
  if (resp?.status === 'stub') return 'Certified (stub mode)';
  return 'Certified';
}

export function humanizePlanError(status: number, json: any): string {
  if (status === 413) return 'Your request is too large. Please shorten it and try again.';
  if (status === 429) return 'You are sending requests too quickly. Please wait a moment and try again.';
  if (status === 415) return 'Unsupported media type. Please send JSON.';
  if (status === 400) return 'Please include a non-empty topic.';
  if (status === 501) return 'Certified is enabled but not implemented yet.';
  if (status === 503) return 'Cerply Certified is disabled.';
  const msg = json?.error?.message || 'Request failed';
  return `${msg} (HTTP ${status})`;
}
