import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering and prevent static generation
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Vercel-specific configuration for catch-all routes
export const maxDuration = 30;
export const preferredRegion = 'auto';

// Force Vercel to treat this as a serverless function
export const revalidate = 0;

// Universal API proxy route for both development and production
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const apiBase = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
  
  // Debug logging
  console.log(`API proxy GET /${path}`, { apiBase, env: process.env.NODE_ENV });
  
  try {
    const response = await fetch(`${apiBase}/${path}`, {
      headers: {
        'User-Agent': 'Cerply-Web-Proxy'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(errorData, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`API proxy error for GET /${path}:`, error);
    return NextResponse.json(
      { error: 'proxy_error', message: 'Failed to proxy request to backend' },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const apiBase = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
  
  try {
    const body = await request.json();
    const response = await fetch(`${apiBase}/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Cerply-Web-Proxy'
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(errorData, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`API proxy error for POST /${path}:`, error);
    return NextResponse.json(
      { error: 'proxy_error', message: 'Failed to proxy request to backend' },
      { status: 502 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const apiBase = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
  
  try {
    const body = await request.json();
    const response = await fetch(`${apiBase}/${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Cerply-Web-Proxy'
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(errorData, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`API proxy error for PUT /${path}:`, error);
    return NextResponse.json(
      { error: 'proxy_error', message: 'Failed to proxy request to backend' },
      { status: 502 }
    );
  }
}
