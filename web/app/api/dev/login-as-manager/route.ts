import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Dev login endpoint for manager role
 * Proxies to backend API and rewrites cookies for same-domain
 */
export async function GET(req: NextRequest) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
    const searchParams = req.nextUrl.searchParams;
    const redirectUrl = searchParams.get('redirect') || '/';
    
    // Forward request to backend
    const apiUrl = `${apiBase}/api/dev/login-as-manager?redirect=${encodeURIComponent(redirectUrl)}`;
    const response = await fetch(apiUrl, {
      redirect: 'manual',
      headers: {
        'User-Agent': req.headers.get('user-agent') || '',
      },
    });

    // Get Set-Cookie headers from backend
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    
    // Create response with same status and location
    const location = response.headers.get('location') || redirectUrl;
    const nextResponse = NextResponse.redirect(location, {
      status: response.status,
    });

    // Rewrite cookies to work on current domain (remove Domain attribute)
    setCookieHeaders.forEach(cookie => {
      const rewritten = cookie
        .split(';')
        .filter(part => !part.trim().toLowerCase().startsWith('domain='))
        .join(';');
      nextResponse.headers.append('set-cookie', rewritten);
    });

    return nextResponse;
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'DEV_LOGIN_FAILED', message: error.message } },
      { status: 500 }
    );
  }
}

