// Node proxy for POST /api/ingest/preview
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { apiRoute } from '@/lib/apiBase';

export async function POST(req: Request) {
  const url = apiRoute('ingest/preview');
  try {
    const body = await req.text();
    const ct = req.headers.get('content-type') ?? 'application/json';
    const auth = req.headers.get('authorization') || '';

    const upstream = await fetch(url, {
      method: 'POST',
      headers: new Headers({
        'content-type': ct,
        accept: 'application/json',
        ...(auth ? { authorization: auth } : {}),
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
      error: { code: 'PREVIEW_FALLBACK', message: 'Planner unavailable. Please try again.' }
    });
    return new Response(sample, {
      status: 503,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-api': 'ingest-preview-fallback',
        'x-upstream': url,
      },
    });
  }
}
