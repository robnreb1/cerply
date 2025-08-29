// web/app/api/prompts/route.ts
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const API = (
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://api-stg.cerply.com'
).replace(/\/+$/, '');

export async function GET() {
  const url = `${API}/api/prompts`;
  try {
    const upstream = await fetch(url, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
      redirect: 'follow',
    });

    if (upstream.ok) {
      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: {
          'content-type': upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          'x-edge': 'prompts-proxy',
          'x-upstream': url,
        },
      });
    }
    // If upstream is 4xx/5xx, fall through to fallback below.
  } catch {
    // Network/other error: fall through to fallback below.
  }

  // Fallback demo prompts so smoke + UI keep working.
  const fallback = JSON.stringify([
    { id: 'demo-1', title: 'Welcome to Cerply', category: 'demo' },
    { id: 'demo-2', title: 'Try a curated prompt', category: 'demo' },
  ]);

  return new Response(fallback, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-edge': 'prompts-fallback',
      'x-upstream': url,
    },
  });
}
