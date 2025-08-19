export function apiFetch(path: string): Promise<Response> {
  const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
  const url = path.startsWith('http') 
    ? path 
    : (path.startsWith('/api') 
      ? path 
      : `/api${path.startsWith('/') ? '' : '/'}${path}`);
  return fetch(url, { cache: 'no-store' });
}

// Legacy apiFetch for existing code
async function apiFetchLegacy<T>(path: string, init?: RequestInit): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
  const url = path.startsWith('http') ? path : `${base}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try { const j:any = await res.json(); msg = j?.error?.message || j?.message || msg; } catch {}
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export type MCQItem = {
  id: string; stem: string; options: string[]; correctIndex: number;
  meta?: { readability?: number; bannedFlags?: string[]; qualityScore?: number; sourceSnippet?: string; };
  stats?: { firstTryCorrect?: number; avgTimeMs?: number; discrimination?: number; };
};

export type GenerateItemsResp = {
  items: MCQItem[];
  objectives: { id: string; title: string; items: MCQItem[] }[];
};

export async function importUrl(args: { url: string; scopeId?: string; template?: string; })
: Promise<{ scopeId: string; template: string; chunks: string[] }> {
  return apiFetchLegacy('/import/url', { method:'POST', body: JSON.stringify(args) });
}
export async function importFile(args: { name: string; content: string; scopeId?: string; template?: string; })
: Promise<{ scopeId: string; template: string; chunks: string[] }> {
  return apiFetchLegacy('/import/file', { method:'POST', body: JSON.stringify(args) });
}
export async function importTranscript(args: { content: string; scopeId?: string; template?: string; })
: Promise<{ scopeId: string; template: string; chunks: string[] }> {
  return apiFetchLegacy('/import/transcript', { method:'POST', body: JSON.stringify(args) });
}
export async function generateItems(args: { chunks: string[]; count_objectives?: number; items_per_objective?: number; })
: Promise<GenerateItemsResp> {
  return apiFetchLegacy('/api/items/generate', { method:'POST', body: JSON.stringify(args) });
}
export async function qualityCompute(items: MCQItem[]): Promise<{ items: MCQItem[] }> {
  return apiFetchLegacy('/curator/quality/compute', { method:'POST', body: JSON.stringify({ items }) });
}
export async function getFlags(): Promise<{ flags: Record<string, boolean> }> {
  return apiFetchLegacy('/flags', { method:'GET' });
}

export type CertifiedPack = {
  id: string; sourceVersion: string; lastChangeDetectedAt: string; publishedUpdateAt?: string; ttuDays?: number;
};
export async function certifiedStatus(packId = 'demo-pack'): Promise<CertifiedPack> {
  return apiFetchLegacy(`/certified/status?packId=${encodeURIComponent(packId)}`, { method:'GET' });
}
