export const runtime = 'edge';
export async function GET() {
  const body = JSON.stringify({ ok: true, service: 'web', ts: new Date().toISOString() });
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'application/json', 'x-edge': 'health' },
  });
}
