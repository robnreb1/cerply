import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const API = process.env.NEXT_PUBLIC_API_BASE ?? process.env.API_BASE ?? 'https://api.cerply.com';

function stripHopByHop(headers: Headers) {
  const out = new Headers(headers);
  [
    'host','connection','keep-alive','transfer-encoding','upgrade',
    'proxy-authenticate','proxy-authorization','te','trailer',
    'x-forwarded-host','x-vercel-deployment-url'
  ].forEach(h => out.delete(h));
  return out;
}

async function proxy(req: NextRequest, { params }: { params: { path?: string[] } }) {
  const path = (params.path ?? []).join('/');
  const src = new URL(req.url);
  const target = `${API}/api/${path}${src.search}`;

  const auth = req.headers.get('authorization') || '';
  const init: RequestInit = {
    method: req.method,
    headers: (() => {
      const h = stripHopByHop(req.headers);
      if (auth) h.set('authorization', auth);
      return h;
    })(),
    cache: 'no-store',
    redirect: 'manual',
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer();
  }

  const upstream = await fetch(target, init);
  const headers = stripHopByHop(upstream.headers);
  headers.set('x-proxied-by', 'next-app-route');

  return new Response(upstream.body, { status: upstream.status, headers });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as OPTIONS };
