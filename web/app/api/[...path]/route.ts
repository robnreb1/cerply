import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering - prevent static generation during build
export const dynamic = 'force-dynamic';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

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
  const target = `${API}/${path}${src.search}`;

  const init: RequestInit = {
    method: req.method,
    headers: stripHopByHop(req.headers),
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
