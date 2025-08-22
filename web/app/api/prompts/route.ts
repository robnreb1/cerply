export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const API = (
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8080'
).replace(/\/+$/, '');

export async function GET() {
  const url = `${API}/prompts`; // no /api prefix on backend
  try {
    const upstream = await fetch(url, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
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
        'x-edge': 'prompts→proxy',
        'x-upstream': url,
      },
    });
  } catch (err) {
    const fallback = JSON.stringify([
      { id: 'demo-1', title: 'Welcome to Cerply', category: 'demo' },
      { id: 'demo-2', title: 'Try a curated prompt', category: 'demo' },
    ]);
    return new Response(fallback, {
      status: 502,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-edge': 'prompts→fallback',
        'x-upstream': url,
      },
    });
  }
}