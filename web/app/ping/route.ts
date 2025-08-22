export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(null, { status: 204, headers: { 'x-edge': 'ping' } });
}
