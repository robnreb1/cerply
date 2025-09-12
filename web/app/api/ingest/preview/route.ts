// Edge proxy for POST /api/ingest/preview
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const API = (
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8080'
).replace(/\/+$/, '');

export async function POST(req: Request) {
  const url = `${API}/api/ingest/preview`;
  try {
    const body = await req.text();
    const ct = req.headers.get('content-type') ?? 'application/json';

    const upstream = await fetch(url, {
      method: 'POST',
      headers: new Headers({
        'content-type': ct,
        accept: 'application/json',
      }),
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
        'x-edge': 'ingest-preview-proxy',
        'x-upstream': url,
      },
    });
  } catch (err) {
    const sample = JSON.stringify({
      error: { code: 'EDGE_PREVIEW_FALLBACK', message: 'Planner unavailable. Please try again.' }
    });
    return new Response(sample, {
      status: 503,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-edge': 'ingest-preview-fallback',
        'x-upstream': url,
      },
    });
  }
}
