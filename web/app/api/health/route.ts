export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  const body = JSON.stringify({ ok: true, service: 'web', ts: new Date().toISOString() });
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-edge': 'health-v2'
    },
  });
}
