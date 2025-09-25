import crypto from 'node:crypto';

export type CitationInput = { id: string; url: string; title?: string };
export type CitationCheck = {
  id: string;
  url: string;
  reachable: boolean;
  status?: number;
  contentType?: string;
  hashPrefix?: string;
  error?: string;
};

export type CitationsReport = {
  total: number;
  reachable: number;
  checks: CitationCheck[];
};

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const to = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => { clearTimeout(to); resolve(v); }, (e) => { clearTimeout(to); reject(e); });
  });
}

export async function validateCitations(
  citations: CitationInput[],
  opts?: { fetchFn?: FetchLike; timeoutMs?: number; maxBytes?: number }
): Promise<CitationsReport> {
  const fetchFn: FetchLike = opts?.fetchFn ?? (globalThis.fetch as any);
  const timeoutMs = Math.max(300, opts?.timeoutMs ?? 1500);
  const maxBytes = Math.max(128, opts?.maxBytes ?? 1024);
  const checks: CitationCheck[] = [];

  for (const c of citations) {
    const row: CitationCheck = { id: c.id, url: c.url, reachable: false };
    try {
      // Prefer HEAD; some servers forbid it → fall back to GET with Range
      let r: Response | null = null;
      try {
        r = await withTimeout(fetchFn(c.url, { method: 'HEAD' }), timeoutMs);
      } catch {}
      if (!r || !r.ok) {
        try {
          r = await withTimeout(fetchFn(c.url, { method: 'GET', headers: { Range: `bytes=0-${maxBytes - 1}` } }), timeoutMs);
        } catch {}
      }
      if (r) {
        row.status = r.status;
        row.contentType = r.headers.get('content-type') || undefined;
        row.reachable = r.ok;
        const body: any = (r as any).body;
        const hasReader = body && typeof body.getReader === 'function';
        if (r.ok && hasReader) {
          const reader = body.getReader();
          const chunk = await reader.read();
          const data: Uint8Array = chunk?.value instanceof Uint8Array ? chunk.value : new Uint8Array();
          const h = crypto.createHash('sha256').update(data).digest('hex');
          row.hashPrefix = h.slice(0, 16);
          try { reader.cancel(); } catch {}
        }
      }
    } catch (e: any) {
      row.error = String(e?.message || e);
    }
    checks.push(row);
  }

  const reachable = checks.filter((x) => x.reachable).length;
  return { total: checks.length, reachable, checks };
}


