import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const MARKETING_BASE_URL = process.env.MARKETING_BASE_URL || 'https://www.cerply.com';

// Parse comma-separated allowlist routes from env
// Default includes login, unauthorized, and health endpoints
// For local dev UAT: also allow manager and admin dashboards, and dev login endpoints
const ALLOWLIST_ROUTES_RAW =
  process.env.APP_ALLOWLIST_ROUTES || '/login,/unauthorized,/api/health,/api/auth,/api/dev/login-as-manager,/api/dev/login-as-admin,/dev/login-manager,/debug/env,/manager,/admin';
const ALLOWLIST_ROUTES = ALLOWLIST_ROUTES_RAW.split(',')
  .map((r) => r.trim())
  .filter(Boolean);

// Parse beta invite codes from env
const BETA_INVITE_CODES_RAW = process.env.BETA_INVITE_CODES || '';
const BETA_INVITE_CODES = BETA_INVITE_CODES_RAW.split(',')
  .map((c) => c.trim())
  .filter(Boolean);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if path matches allowlist
  const isAllowlisted = ALLOWLIST_ROUTES.some((route) => {
    const routePattern = route.replace(/\$/, ''); // Remove $ suffix if present
    if (route.endsWith('$')) {
      // Exact match
      return pathname === routePattern;
    }
    // Prefix match
    return pathname === routePattern || pathname.startsWith(`${routePattern}/`);
  });

  if (isAllowlisted) {
    return NextResponse.next();
  }

  // Check for session cookie (example: cerply.sid)
  const sessionCookie = request.cookies.get('cerply.sid');
  if (sessionCookie) {
    return NextResponse.next();
  }

  // Check for beta invite via header or cookie
  const betaHeader = request.headers.get('x-beta-key');
  const betaCookie = request.cookies.get('beta')?.value;

  if (betaHeader && BETA_INVITE_CODES.includes(betaHeader)) {
    // Set beta cookie and allow
    const response = NextResponse.next();
    response.cookies.set('beta', betaHeader, {
      httpOnly: true,
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });
    return response;
  }

  if (betaCookie && BETA_INVITE_CODES.includes(betaCookie)) {
    return NextResponse.next();
  }

  // Redirect unauthorized users to login page
  // Marketing site handles lead generation; app requires enterprise auth
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (sw.js, manifest, robots.txt, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sw.js|manifest.webmanifest|icons/.*|__stamp.txt).*)',
  ],
};

