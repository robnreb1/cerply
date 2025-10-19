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
    
    // Forward important headers including cookies
    const headers = new Headers({
      'content-type': req.headers.get('content-type') || 'application/json',
      'accept': req.headers.get('accept') || 'application/json',
    });
    
    // Forward cookie header
    const cookie = req.headers.get('cookie');
    if (cookie) {
      headers.set('cookie', cookie);
    }
    
    // Get request body if present
    let body: string | null = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = await req.text();
    }

    const response = await fetch(apiUrl, {
      method: req.method,
      headers,
      body,
    });

    // Get response as text and parse
    const responseText = await response.text();
    
    return new NextResponse(responseText, {
      status: response.status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('[Curator Modules Proxy] Error:', error);
    return NextResponse.json(
      { error: { code: 'PROXY_ERROR', message: error.message } },
      { status: 502 }
    );
  }
}

