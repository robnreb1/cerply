export const runtime = 'edge';

function passThroughHeaders(h: Headers) {
  const out = new Headers();
  for (const [k, v] of h.entries()) {
    if (!/^connection$|^keep-alive$|^transfer-encoding$|^upgrade$/i.test(k)) {
      out.set(k, v);
    }
  }
  return out;
}

async function proxy(req: Request, tail: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
  const upstream = `${base}/api/auth/${tail}`;
  const init: RequestInit = {
    method: req.method,
    headers: passThroughHeaders(req.headers),
    redirect: 'manual',
    credentials: 'include',
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.blob();
  }
  const res = await fetch(upstream, init);
  const headers = passThroughHeaders(res.headers);
  headers.set('x-edge', 'auth-proxy');
  headers.set('x-upstream', upstream);
  return new Response(res.body, { status: res.status, headers });
}

export async function GET(req: Request, ctx: { params: { path?: string[] } }) {
  return proxy(req, (ctx.params.path ?? []).join('/'));
}
export async function POST(req: Request, ctx: { params: { path?: string[] } }) {
  return proxy(req, (ctx.params.path ?? []).join('/'));
}
