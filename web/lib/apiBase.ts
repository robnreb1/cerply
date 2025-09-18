// web/lib/apiBase.ts
// Single source of truth for API base + URL helpers.

/** Returns the normalized API base (no trailing slash). */
export function apiBase(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_API_BASE ??
    process.env.API_BASE ??
    'https://api.cerply.com';
  return fromEnv.replace(/\/+$/, '');
}

/** Joins the API base with a path (ensures exactly one slash). */
export function apiUrl(path: string = ''): string {
  const base = apiBase();
  const p = String(path).replace(/^\/+/, '');
  return p ? `${base}/${p}` : base;
}

/** Convenience for backend routes that already include '/api/...'. */
export function apiRoute(pathAfterApi: string): string {
  const p = String(pathAfterApi).replace(/^\/+/, '');
  return apiUrl(`api/${p}`);
}
