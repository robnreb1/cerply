export const runtime = 'edge';
import { apiBase } from '@/lib/apiBase';

export async function GET(request: Request) {
  const upstream = `${apiBase()}/api/health`;
  const res = await fetch(upstream, {
    method: 'GET',
    // deterministic: no edge cache for healthchecks
    cache: 'no-store',
    headers: {
      'accept': 'application/json',
      // forward a few diagnostics so backend can log origin
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
      'x-edge': 'health→proxy',
      'x-upstream': upstream,
    },
  });
}
