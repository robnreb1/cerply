import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

const API = process.env.NEXT_PUBLIC_API_BASE ?? process.env.API_BASE ?? 'https://api.cerply.com';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const auth = request.headers.get('authorization') || '';

    const resp = await fetch(`${API}/api/curator/quality/compute`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(auth ? { authorization: auth } : {}),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      redirect: 'follow',
    });

    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.status });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'proxy_error', message: String(err) },
      { status: 502 }
    );
  }
}
