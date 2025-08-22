export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const RAW_API =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8080';

const API = RAW_API.replace(/\/+$/, '');

export async function GET() {
  const target = `${API}/prompts`;
  const r = await fetch(target, {
    cache: 'no-store',
    headers: { accept: 'application/json' },
  });

  const body = await r.text();
  return new Response(body, {
    status: r.status,
    headers: {
      'content-type': r.headers.get('content-type') ?? 'application/json',
      'x-proxy-target': target,
    },
  });
}
