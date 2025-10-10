import { NextRequest } from 'next/server';
import { apiRoute } from '@/lib/apiBase';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;


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
  
  // Test mode: if path is "test-proxy", return debug info instead of proxying
  if (path === 'test-proxy') {
    return new Response(JSON.stringify({
      message: 'Catch-all proxy route is working!',
      path,
      NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
      apiRoute: apiRoute(path),
      timestamp: new Date().toISOString()
    }), {
      headers: { 'content-type': 'application/json', 'x-proxied-by': 'next-app-route' }
    });
  }
  
  const target = `${apiRoute(path)}${src.search}`;

  // Debug logging
  console.log('[PROXY] path:', path);
  console.log('[PROXY] target:', target);
  console.log('[PROXY] NEXT_PUBLIC_API_BASE:', process.env.NEXT_PUBLIC_API_BASE);

  const auth = req.headers.get('authorization') || '';
  const init: RequestInit = {
    method: req.method,
    headers: (() => {
      const h = stripHopByHop(req.headers);
      if (auth) h.set('authorization', auth);
      
      // For local dev/UAT: automatically add admin token if not in production
      if (process.env.NODE_ENV !== 'production') {
        const adminToken = process.env.ADMIN_TOKEN || 'dev-admin-token-12345';
        h.set('x-admin-token', adminToken);
      }
      
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
  headers.set('x-proxy-target', target); // Add target URL to response headers for debugging

  return new Response(upstream.body, { status: upstream.status, headers });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as OPTIONS };
