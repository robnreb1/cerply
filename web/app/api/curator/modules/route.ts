import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Proxy for /api/curator/modules endpoints
 * Forwards to backend API with credentials
 */
export async function GET(req: NextRequest) {
  return proxyToBackend(req);
}

export async function POST(req: NextRequest) {
  return proxyToBackend(req);
}

export async function PUT(req: NextRequest) {
  return proxyToBackend(req);
}

export async function DELETE(req: NextRequest) {
  return proxyToBackend(req);
}

async function proxyToBackend(req: NextRequest) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
    const url = new URL(req.url);
    const apiUrl = `${apiBase}${url.pathname}${url.search}`;
    
    // Forward all headers except host
    const headers = new Headers(req.headers);
    headers.delete('host');
    
    // Get request body if present
    let body: BodyInit | null = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = await req.arrayBuffer();
    }

    const response = await fetch(apiUrl, {
      method: req.method,
      headers,
      body,
      credentials: 'include',
    });

    // Forward response
    const responseBody = await response.arrayBuffer();
    return new NextResponse(responseBody, {
      status: response.status,
      headers: response.headers,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'PROXY_ERROR', message: error.message } },
      { status: 502 }
    );
  }
}

