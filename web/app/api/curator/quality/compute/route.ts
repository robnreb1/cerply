import { NextResponse } from 'next/server';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const resp = await fetch(`${API}/curator/quality/compute`, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Cerply-Web-Proxy'
      },
      body: JSON.stringify(body),
      cache: 'no-store'
    });
    
    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      return NextResponse.json(
        errorData,
        { status: resp.status }
      );
    }
    
    const data = await resp.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Quality compute proxy error:', err);
    return NextResponse.json(
      { error: 'proxy_error', message: String(err) },
      { status: 502 }
    );
  }
}
