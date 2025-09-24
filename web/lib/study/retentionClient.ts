// web/lib/study/retentionClient.ts
import { apiRoute } from '../apiBase';
import { enabled as analyticsEnabled, anonSessionId, pageId, postEvents } from '../analytics/client';

export type Card = { id: string; front: string; back: string };
export type Progress = { card_id: string; reps: number; ef: number; intervalDays: number; lastGrade?: number; dueISO: string };

export type ScheduleRequest = {
  session_id: string;
  plan_id: string;
  items: Card[];
  prior?: Progress[];
  algo?: 'sm2-lite';
  now?: string;
};
export type ScheduleResponse = { session_id: string; plan_id: string; order: string[]; due: string; meta: { algo: 'sm2-lite'; version: 'v0' } };

export type ProgressEvent = { session_id: string; card_id: string; action: 'grade'|'flip'|'reset'; grade?: 0|1|2|3|4|5; at: string };
export type ProgressSnapshot = { session_id: string; items: Progress[] };

async function fetchJson(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const text = await r.text();
  let json: any = undefined;
  try { json = text ? JSON.parse(text) : undefined; } catch {}
  return { status: r.status, headers: r.headers, json };
}

export async function schedule(req: ScheduleRequest) {
  const url = apiRoute('certified/schedule');
  return fetchJson(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(req) });
}

export async function getProgress(sessionId: string) {
  const url = apiRoute(`certified/progress?sid=${encodeURIComponent(sessionId)}`);
  return fetchJson(url, { method: 'GET' });
}

export async function postProgress(evt: ProgressEvent) {
  const url = apiRoute('certified/progress');
  const res = await fetchJson(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(evt) });
  if (analyticsEnabled()) {
    const ev = evt.action === 'flip' ? 'study_flip' : evt.action === 'reset' ? 'study_reset' : 'study_next';
    const e = [{ event: ev as any, ts: new Date().toISOString(), anon_session_id: anonSessionId(), page_id: pageId(), props: { card_id: evt.card_id, grade: evt.grade } }];
    postEvents('', e).catch(()=>{});
  }
  return res;
}
