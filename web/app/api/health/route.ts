import { NextResponse } from 'next/server';

// Force dynamic rendering - prevent static generation during build
export const dynamic = 'force-dynamic';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

export async function GET() {
  try {
    const resp = await fetch(`${API}/health`, { 
      headers: {
        'User-Agent': 'Cerply-Web-Proxy'
      }
    });
    
    if (!resp.ok) {
      return NextResponse.json(
        { error: `Backend returned ${resp.status}` },
        { status: resp.status }
      );
    }
    
    const data = await resp.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Health proxy error:', err);
    return NextResponse.json(
      { error: 'proxy_error', message: String(err) },
      { status: 502 }
    );
  }
}
