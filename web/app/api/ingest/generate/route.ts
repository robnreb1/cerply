export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const API = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080').replace(/\/+$/, '');

export async function POST(req: Request) {
  const url = `${API}/api/ingest/generate`;
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': req.headers.get('content-type') ?? 'application/json',
        accept: 'application/json',
      },
      body: req.body,
      redirect: 'follow',
      cache: 'no-store',
    });

    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-edge': 'ingest-generate-proxy',
        'x-upstream': url,
      },
    });
  } catch (err) {
    const fallback = JSON.stringify({
      ok: false,
      error: 'generate upstream unreachable',
      modules: [],
      ts: new Date().toISOString(),
    });
    return new Response(fallback, {
      status: 502,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-edge': 'ingest-generate-fallback',
        'x-upstream': url,
      },
    });
  }
}