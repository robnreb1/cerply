export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  const data = [
    { id: 'demo-1', title: 'Welcome to Cerply', category: 'demo' },
    { id: 'demo-2', title: 'Try a curated prompt', category: 'demo' },
  ];
  const body = JSON.stringify(data);
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-edge': 'prompts-v2'
    },
  });
}
