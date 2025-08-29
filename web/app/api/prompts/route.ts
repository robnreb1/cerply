export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// In dev we default to mocks, but allow an explicit override:
// - NEXT_PUBLIC_USE_MOCKS=true  -> force mocks
// - NEXT_PUBLIC_USE_MOCKS=false -> force live proxy
// - (unset) in dev              -> mocks by default
// - (unset) in prod             -> live proxy by default
const USE_MOCKS = (() => {
  const val = process.env.NEXT_PUBLIC_USE_MOCKS;
  if (val === 'true') return true;
  if (val === 'false') return false;
  return process.env.NODE_ENV !== 'production';
})();

export async function GET() {
  // 1) Dev: return stable mocks
  if (USE_MOCKS) {
    const data = [
      { id: 'demo-1', title: 'Welcome to Cerply', category: 'demo' },
      { id: 'demo-2', title: 'Try a curated prompt', category: 'demo' },
    ];
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-edge': 'prompts-mock',
      },
    });
  }

  // 2) Staging/Prod: proxy to upstream
  const base = (process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
  const url = `${base}/api/prompts`; // adjust to your backend path if needed
  // Guard: if base is unset or not absolute (would self-fetch this route), return safe fallback
  if (!base || !/^https?:\/\//i.test(base)) {
    const fallback = [
      { id: 'demo-1', title: 'Welcome to Cerply', category: 'demo' },
      { id: 'demo-2', title: 'Try a curated prompt', category: 'demo' },
    ];
    return new Response(JSON.stringify(fallback), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-edge': 'prompts-misconfig',
        'x-upstream': base ? `${base}/api/prompts` : '(unset)',
      },
    });
  }
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
        'content-type': upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-edge': 'prompts-proxy',
        'x-upstream': url,
      },
    });
  } catch {
    const fallback = [
      { id: 'demo-1', title: 'Welcome to Cerply', category: 'demo' },
      { id: 'demo-2', title: 'Try a curated prompt', category: 'demo' },
    ];
    return new Response(JSON.stringify(fallback), {
      status: 502,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-edge': 'prompts-fallback',
        'x-upstream': url,
      },
    });
  }
}