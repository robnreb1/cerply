export const runtime = 'edge';

const API = (process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/+$/, '');

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const upstream = `${API}/prompts${url.search}`;
  const r = await fetch(upstream, {
    headers: { accept: 'application/json' },
  });
  const out = new Response(r.body, { status: r.status, statusText: r.statusText });
  out.headers.set('content-type', r.headers.get('content-type') ?? 'application/json');
  out.headers.set('x-edge-proxy', 'true');
  out.headers.set('x-upstream', upstream);
  return out;
}
