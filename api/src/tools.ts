import { pool } from './db';

export type PlanModule = { id: string; title: string; estMinutes: number };
export type LearnerProfile = { userId: string; prefs?: Record<string, any>; updatedAt: string };

const _profiles = new Map<string, LearnerProfile>();
const _plans = new Map<string, PlanModule[]>();

// --- search.web ---
const DEFAULT_WHITELIST = ['wikipedia.org', 'bbc.co.uk', 'gov.uk', 'mit.edu', 'stanford.edu'];

export async function searchWeb(query: string, opts?: { limit?: number; domains?: string[] }) {
  const limit = Math.max(1, Math.min(10, Number(opts?.limit ?? 5)));
  const domains = Array.isArray(opts?.domains) && opts!.domains!.length > 0 ? opts!.domains! : DEFAULT_WHITELIST;
  // Stubbed deterministic snippets
  const base = [
    { title: `About ${query}`, snippet: `${query} overview and key points.`, domain: domains[0] || 'wikipedia.org' },
    { title: `${query} essentials`, snippet: `Core concepts in ${query}.`, domain: domains[1 % domains.length] || 'bbc.co.uk' },
    { title: `${query} practice`, snippet: `Practice items for ${query}.`, domain: domains[2 % domains.length] || 'gov.uk' },
    { title: `${query} syllabus`, snippet: `Syllabus-aligned notes for ${query}.`, domain: domains[3 % domains.length] || 'mit.edu' },
    { title: `${query} exam tips`, snippet: `Exam techniques for ${query}.`, domain: domains[4 % domains.length] || 'stanford.edu' },
  ];
  const results = base.slice(0, limit).map((r, i) => ({
    title: r.title,
    url: `https://${r.domain}/search?q=${encodeURIComponent(query)}#${i + 1}`,
    snippet: r.snippet,
    domain: r.domain,
  }));
  return { query, limit, results };
}

// --- kb.fetch ---
export async function kbFetch(kind: string, id: string) {
  if (kind === 'cerply_certified') {
    return { kind, id, content: { title: `Certified Pack ${id}`, items: [], metadata: { certified: true } } };
  }
  if (kind === 'user_private') {
    return { kind, id, content: { notes: `Private notes for ${id}` } };
  }
  return { kind, id, content: null };
}

// --- profile.read / profile.write ---
export async function profileRead(userId: string): Promise<LearnerProfile> {
  return _profiles.get(userId) ?? { userId, prefs: {}, updatedAt: new Date().toISOString() };
}

export async function profileWrite(userId: string, patch: Record<string, any>): Promise<LearnerProfile> {
  const prev = _profiles.get(userId) ?? { userId, prefs: {}, updatedAt: new Date().toISOString() } as LearnerProfile;
  const merged: LearnerProfile = {
    userId,
    prefs: { ...(prev.prefs ?? {}), ...(patch ?? {}) },
    updatedAt: new Date().toISOString()
  };
  _profiles.set(userId, merged);
  try {
    await pool.query('insert into artefacts (kind, title, content, created_at) values ($1,$2,$3, now())', [
      'learner_profile', `profile:${userId}`, JSON.stringify(merged)
    ]);
  } catch {}
  return merged;
}

// --- modules.store / modules.load ---
export async function modulesStore(userId: string, plan: PlanModule[]) {
  _plans.set(userId, plan);
  return { ok: true } as const;
}

export async function modulesLoad(userId: string): Promise<PlanModule[] | null> {
  return _plans.get(userId) ?? null;
}

// --- analytics.record ---
export async function analyticsRecord(event: Record<string, any>) {
  try {
    await pool.query('insert into artefacts (kind, title, content, created_at) values ($1,$2,$3, now())', [
      'telemetry', 'chat', JSON.stringify(event)
    ]);
  } catch {}
  return { ok: true } as const;
}


