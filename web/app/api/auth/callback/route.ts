// web/app/api/auth/callback/route.ts
export const runtime = 'nodejs';         // ensure cookies can be forwarded
export const dynamic = 'force-dynamic';  // don't cache

export async function GET(req: Request) {
  const reqUrl = new URL(req.url);

  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, '') || 'http://localhost:8080';

  // Build upstream URL and PRESERVE the original query (?token=...)
  const upstream = new URL('/api/auth/callback', apiBase);
  upstream.search = reqUrl.search;

  const upstreamRes = await fetch(upstream.toString(), {
    method: 'GET',
    headers: { accept: 'application/json' },
    redirect: 'manual',
  });

  // Forward critical headers, especially Set-Cookie
  const headers = new Headers();
  const setCookie = upstreamRes.headers.get('set-cookie');
  if (setCookie) headers.append('set-cookie', setCookie);

  headers.set('cache-control', 'no-store');
  headers.set('x-edge', 'auth-proxy');
  headers.set('x-upstream', upstream.toString());

  if (upstreamRes.status === 204) {
    // API sets cookie and returns 204 No Content
    return new Response(null, { status: 204, headers });
  }

  const body = await upstreamRes.text();
  return new Response(body, { status: upstreamRes.status, headers });
}