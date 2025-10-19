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
    
    // Forward headers including cookies
    const headers = new Headers();
    req.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'host') {
        headers.set(key, value);
      }
    });
    
    // Get request body if present
    let body: BodyInit | null = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = await req.arrayBuffer();
    }

    const response = await fetch(apiUrl, {
      method: req.method,
      headers,
      body,
    });

    // Forward response with proper headers
    const responseBody = await response.arrayBuffer();
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      responseHeaders.set(key, value);
    });
    
    return new NextResponse(responseBody, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[Curator Modules Proxy]', error);
    return NextResponse.json(
      { error: { code: 'PROXY_ERROR', message: error.message } },
      { status: 502 }
    );
  }
}

