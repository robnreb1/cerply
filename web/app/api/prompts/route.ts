// web/app/api/prompts/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const API = process.env.NEXT_PUBLIC_API_BASE ?? process.env.API_BASE ?? 'https://api.cerply.com';

export async function GET() {
  const url = `${API}/api/prompts`;
  try {
    const resp = await fetch(url, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
      redirect: 'follow',
    });
    if (resp.ok) {
      const body = await resp.text();
      return new Response(body, {
        status: resp.status,
        headers: {
          'content-type': resp.headers.get('content-type') ?? 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          'x-edge': 'prompts-proxy',
          'x-upstream': url,
        },
      });
    }
  } catch {
    // fall through to fallback
  }

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
