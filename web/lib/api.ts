export function apiFetch(path: string): Promise<Response> {
  const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
  const url = path.startsWith('http') 
    ? path 
    : (path.startsWith('/api') 
      ? path 
      : `/api${path.startsWith('/') ? '' : '/'}${path}`);
  return fetch(url, { cache: 'no-store' });
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
  return apiFetch('/import/url', { method:'POST', body: JSON.stringify(args) });
}
export async function importFile(args: { name: string; content: string; scopeId?: string; template?: string; })
: Promise<{ scopeId: string; template: string; chunks: string[] }> {
  return apiFetch('/import/file', { method:'POST', body: JSON.stringify(args) });
}
export async function importTranscript(args: { content: string; scopeId?: string; template?: string; })
: Promise<{ scopeId: string; template: string; chunks: string[] }> {
  return apiFetch('/import/transcript', { method:'POST', body: JSON.stringify(args) });
}
export async function generateItems(args: { chunks: string[]; count_objectives?: number; items_per_objective?: number; })
: Promise<GenerateItemsResp> {
  return apiFetch('/api/items/generate', { method:'POST', body: JSON.stringify(args) });
}
export async function qualityCompute(items: MCQItem[]): Promise<{ items: MCQItem[] }> {
  return apiFetch('/curator/quality/compute', { method:'POST', body: JSON.stringify({ items }) });
}
export async function getFlags(): Promise<{ flags: Record<string, boolean> }> {
  return apiFetch('/flags', { method:'GET' });
}

export type CertifiedPack = {
  id: string; sourceVersion: string; lastChangeDetectedAt: string; publishedUpdateAt?: string; ttuDays?: number;
};
export async function certifiedStatus(packId = 'demo-pack'): Promise<CertifiedPack> {
  return apiFetch(`/certified/status?packId=${encodeURIComponent(packId)}`, { method:'GET' });
}
