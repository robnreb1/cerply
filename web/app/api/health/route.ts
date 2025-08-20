/* web/app/api/health/route.ts */
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Dev defaults to mocks; can be overridden:
// - NEXT_PUBLIC_USE_MOCKS=true  -> force mocks
// - NEXT_PUBLIC_USE_MOCKS=false -> force live proxy
// - (unset) in dev              -> mocks by default
// - (unset) in prod             -> live proxy by default
const USE_MOCKS = (() => {
  const v = process.env.NEXT_PUBLIC_USE_MOCKS;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return process.env.NODE_ENV !== 'production';
})();

export async function GET() {
  // 1) Mock mode
  if (USE_MOCKS) {
    const body = JSON.stringify({
      ok: true,
      service: 'web',
      env: 'mock',
      ts: new Date().toISOString(),
    });
    return new Response(body, {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-edge': 'health-mock',
      },
    });
  }

  // 2) Misconfiguration guard (prevents self-fetch / recursion)
  const base = (
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    ''
  ).replace(/\/+$/, '');

  const hasAbsolute = /^https?:\/\//i.test(base);
  if (!hasAbsolute) {
    const body = JSON.stringify({
      ok: true,
      service: 'web',
      env: 'misconfig',
      ts: new Date().toISOString(),
    });
    return new Response(body, {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-edge': 'health-misconfig',
        'x-upstream': base ? `invalid-base:${base}` : 'missing-base',
      },
    });
  }

  // 3) Proxy to upstream (direct health endpoint)
  const url = `${base}/health`;
  try {
    const upstream = await fetch(url, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
      redirect: 'follow',
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        'content-type':
          upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-edge': 'health-proxy',
        'x-upstream': url,
      },
    });
  } catch {
    const body = JSON.stringify({
      ok: false,
      service: 'web',
      error: 'health upstream unreachable',
      ts: new Date().toISOString(),
    });
    return new Response(body, {
      status: 502,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-edge': 'health-fallback',
        'x-upstream': url,
      },
    });
  }
}
