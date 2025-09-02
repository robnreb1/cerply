export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const API = (
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8080'
).replace(/\/+$/, '');

export async function POST(req: Request) {
  const url = `${API}/api/ingest/parse`;

  try {
    // Build headers, forward content-type if present
    const headers = new Headers();
    const ct = req.headers.get('content-type') || '';
    if (ct) headers.set('content-type', ct);
    headers.set('accept', 'application/json');

    // Pass-through body (supports json or text/plain)
    const body = await req.arrayBuffer();

    const upstream = await fetch(url, {
      method: 'POST',
      headers,
      body,
      cache: 'no-store',
      redirect: 'follow',
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        'content-type':
          upstream.headers.get('content-type') ??
          'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-edge': 'ingest-parse-proxy',
        'x-upstream': url,
      },
    });
  } catch (err) {
    const payload = JSON.stringify({
      ok: false,
      error: 'proxy_error',
      message: String(err),
    });
    return new Response(payload, {
      status: 502,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-edge': 'ingest-parse-fallback',
        'x-upstream': url,
      },
    });
  }
}