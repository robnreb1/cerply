export const runtime = 'edge';

const RAW_API =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8080';
const API = RAW_API.replace(/\/+$/, '');

export async function GET() {
  const r = await fetch(`${API}/api/health`, { cache: 'no-store' });
  return new Response(await r.text(), {
    status: r.status,
    headers: { 'content-type': r.headers.get('content-type') ?? 'text/plain' },
  });
}