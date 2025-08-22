export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const API = (
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8080'
).replace(/\/+$/, '');

export async function GET() {
  const url = `${API}/api/health`;
  try {
    const upstream = await fetch(url, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
      // Ensure edge can reach cross-origin
      redirect: 'follow',
    });

    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        'content-type':
          upstream.headers.get('content-type') ??
          'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-edge': 'health→proxy',
        'x-upstream': url,
      },
    });
  } catch (err) {
    const fallback = JSON.stringify({
      ok: false,
      service: 'web',
      error: 'health upstream unreachable',
      ts: new Date().toISOString(),
    });
    return new Response(fallback, {
      status: 502,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-edge': 'health→fallback',
        'x-upstream': url,
      },
    });
  }
}