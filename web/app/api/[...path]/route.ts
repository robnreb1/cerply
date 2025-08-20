import { NextRequest, NextResponse } from 'next/server';

// Development-only API proxy route
// In production, this is handled by Next.js rewrites
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
  
  try {
    const response = await fetch(`${apiBase}/${path}`);
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to proxy request' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
  
  try {
    const body = await request.json();
    const response = await fetch(`${apiBase}/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to proxy request' },
      { status: 500 }
    );
  }
}
