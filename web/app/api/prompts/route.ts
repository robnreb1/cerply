export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  const data = [
    { id: 'demo-1', title: 'Welcome to Cerply', category: 'demo' },
    { id: 'demo-2', title: 'Try a curated prompt', category: 'demo' },
  ];
  return Response.json(data, { headers: { 'x-edge': 'prompts' } });
}
