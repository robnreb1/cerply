export const runtime = 'edge';
export const dynamic = 'force-static';

export function GET() {
  return new Response(null, { status: 204 });
}
