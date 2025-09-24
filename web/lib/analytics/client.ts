export type AnalyticsEvent = {
  event: 'plan_request'|'study_flip'|'study_next'|'study_prev'|'study_reset'|'study_shuffle'|'study_complete';
  ts: string;
  anon_session_id: string;
  page_id?: string;
  props?: Record<string, any>;
  context?: { topic?: string; level?: string; goals?: string[]; engine?: string };
};

export function enabled(): boolean {
  return process.env.NEXT_PUBLIC_PREVIEW_ANALYTICS === 'true';
}

export async function postEvents(base: string, events: AnalyticsEvent[], token?: string): Promise<void> {
  if (!enabled()) return;
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers['authorization'] = `Bearer ${token}`;
  await fetch(`${base}/api/analytics/ingest`, {
    method: 'POST', headers, body: JSON.stringify({ events }), cache: 'no-store'
  }).catch(() => {});
}

export function anonSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  const k = 'cerply_anon_session_id';
  let v = window.localStorage.getItem(k);
  if (!v) { v = Math.random().toString(36).slice(2); window.localStorage.setItem(k, v); }
  return v;
}

export function pageId(): string {
  if (typeof window === 'undefined') return 'ssr';
  return Math.random().toString(36).slice(2);
}


