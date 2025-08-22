export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(
    { ok: true, service: 'web', ts: new Date().toISOString() },
    { headers: { 'x-edge': 'health' } }
  );
}
