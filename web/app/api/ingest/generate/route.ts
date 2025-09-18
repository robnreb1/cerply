// web/app/api/ingest/generate/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { apiRoute } from '@/lib/apiBase';

export async function POST(req: Request) {
  const url = apiRoute('ingest/generate');
  try {
    const auth = req.headers.get('authorization') || '';
    const ct = req.headers.get('content-type') ?? 'application/json';
    const bodyText = await req.text();
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': ct,
        accept: 'application/json',
        ...(auth ? { authorization: auth } : {}),
      },
      body: bodyText,
      cache: 'no-store',
      redirect: 'follow',
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-upstream': url,
      },
    });
  } catch {
    const body = JSON.stringify({ ok: false, error: 'generate upstream unreachable' });
    return new Response(body, {
      status: 502,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-upstream': url,
      },
    });
  }
}

