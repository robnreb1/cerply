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

