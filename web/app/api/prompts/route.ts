import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || 'https://api.cerply.com';

export async function GET(req: NextRequest) {
  const target = `${API_BASE}/api/prompts`;
  
  try {
    const response = await fetch(target, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    
    const data = await response.json();
    
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'x-proxied-by': 'next-explicit-route',
        'x-proxy-target': target,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to proxy request', target },
      { status: 502 }
    );
  }
}
