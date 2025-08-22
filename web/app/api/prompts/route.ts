export const runtime = 'edge';
export async function GET(): Promise<Response> {
  return Response.json({ prompts: [], source: 'edge-stub' });
}
