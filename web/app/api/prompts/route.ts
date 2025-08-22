export const runtime = 'edge';
import { apiBase } from '@/lib/apiBase';

export async function GET(request: Request) {
  const upstream = `${apiBase()}/prompts`;
  const res = await fetch(upstream, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      'accept': 'application/json',
      'x-forwarded-host': new URL(request.url).host,
      'x-forwarded-proto': 'https',
    },
  });

  const body = await res.text();
  const ct = res.headers.get('content-type') || 'application/json';

  return new Response(body, {
    status: res.status,
    headers: {
      'content-type': ct,
      'x-edge': 'prompts→proxy',
      'x-upstream': upstream,
    },
  });
}
