export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const API = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080').replace(/\/+$/, '');

export async function POST(req: Request) {
  const url = `${API}/api/ingest/followup`;
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': req.headers.get('content-type') ?? 'application/json', accept: 'application/json' },
      body: await req.text(),
      cache: 'no-store',
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-edge': 'ingest-followup-proxy',
        'x-upstream': url,
      },
    });
  } catch (err) {
    const fallback = JSON.stringify({ ok: true, modules: [], hint: { action: 'hint', message: 'upstream unavailable' } });
    return new Response(fallback, {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-edge': 'ingest-followup-fallback',
        'x-upstream': url,
      },
    });
  }
}

