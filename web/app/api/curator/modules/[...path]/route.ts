import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Catch-all proxy for /api/curator/modules/* endpoints
 * Forwards to backend API with credentials
 */
export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyToBackend(req, params);
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyToBackend(req, params);
}

export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyToBackend(req, params);
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyToBackend(req, params);
}

async function proxyToBackend(req: NextRequest, params: { path: string[] }) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
    const subPath = params.path.join('/');
    const url = new URL(req.url);
    const apiUrl = `${apiBase}/api/curator/modules/${subPath}${url.search}`;
    
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

    // Get response as text
    const responseText = await response.text();
    
    return new NextResponse(responseText, {
      status: response.status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('[Curator Modules Proxy]', error);
    return NextResponse.json(
      { error: { code: 'PROXY_ERROR', message: error.message } },
      { status: 502 }
    );
  }
}

