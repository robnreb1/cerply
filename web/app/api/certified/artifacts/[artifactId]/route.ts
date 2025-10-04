import { NextRequest } from 'next/server';
import { apiBase } from '@/lib/apiBase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function proxyArtifact(req: NextRequest, { params }: { params: { artifactId: string } }) {
  const { artifactId } = params;
  
  // Check if NEXT_PUBLIC_API_BASE is configured
  const apiBaseUrl = apiBase();
  if (!apiBaseUrl || apiBaseUrl === 'https://api.cerply.com') {
    return new Response(
      JSON.stringify({ 
        error: { 
          code: 'CONFIGURATION_ERROR', 
          message: 'NEXT_PUBLIC_API_BASE is not configured. Please set NEXT_PUBLIC_API_BASE environment variable.' 
        } 
      }),
      { 
        status: 500, 
        headers: { 
          'content-type': 'application/json',
          'access-control-allow-origin': '*',
        } 
      }
    );
  }

  // Build upstream URL
  const upstreamUrl = `${apiBaseUrl}/api/certified/artifacts/${artifactId}`;
  
  try {
    // Fetch from upstream API
    const upstreamResponse = await fetch(upstreamUrl, {
      method: req.method,
      headers: {
        // Forward relevant headers
        'accept': req.headers.get('accept') || 'application/json',
        'user-agent': req.headers.get('user-agent') || 'Next.js-Proxy',
      },
      cache: 'no-store',
    });

    // Check if this is a .sig (binary) request
    const isSigRequest = artifactId.endsWith('.sig');
    
    // Prepare response headers
    const responseHeaders = new Headers();
    
    // Always set CORS headers
    responseHeaders.set('access-control-allow-origin', '*');
    responseHeaders.delete('access-control-allow-credentials'); // Ensure this is not present
    
    // Handle different response types
    if (isSigRequest) {
      // Binary signature response
      responseHeaders.set('content-type', 'application/octet-stream');
      
      // Forward cache-control if present
      const cacheControl = upstreamResponse.headers.get('cache-control');
      if (cacheControl) {
        responseHeaders.set('cache-control', cacheControl);
      }
      
      // Get binary data
      const arrayBuffer = await upstreamResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      return new Response(buffer, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    } else {
      // JSON artifact response
      responseHeaders.set('content-type', 'application/json');
      
      // Forward cache-control and etag if present
      const cacheControl = upstreamResponse.headers.get('cache-control');
      const etag = upstreamResponse.headers.get('etag');
      
      if (cacheControl) {
        responseHeaders.set('cache-control', cacheControl);
      }
      if (etag) {
        responseHeaders.set('etag', etag);
      }
      
      // Get response body
      const responseText = await upstreamResponse.text();
      
      return new Response(responseText, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    }
  } catch (error) {
    // Handle fetch errors
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ 
        error: { 
          code: 'UPSTREAM_ERROR', 
          message: 'Failed to fetch from upstream API' 
        } 
      }),
      { 
        status: 502, 
        headers: { 
          'content-type': 'application/json',
          'access-control-allow-origin': '*',
        } 
      }
    );
  }
}

export { proxyArtifact as GET };
