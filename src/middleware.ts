import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/* ═══════════════════════════════════════════════════════
   Auth Guard Middleware (Next.js 16+)

   Runs in the edge runtime before every matched route.

   Security model:
   - __session is an HttpOnly cookie written exclusively by
     /api/auth/session after Firebase Admin SDK verification +
     createSessionCookie(). It cannot be set by client-side JS.
   - Cookie maxAge (14 days) and the Firebase session cookie's own
     exp claim (also 14 days) govern longevity. No manual exp check
     is needed here — that was the source of the hourly redirect loop.
   - Real auth verification (verifySessionCookie / verifyIdToken) lives
     in API routes and server components, not in the edge layer.

   What this middleware does:
   1. /dashboard/* and /vendor-portal/* — require __session cookie
   2. Account-type gating — __acct cookie routes vendors vs investors
   3. Auth pages (/login etc.) — bounce users who already have a session
      only when an explicit redirectTo param is present
   4. /invest/* and all public routes — pass through untouched
   ═══════════════════════════════════════════════════════ */

const SESSION_COOKIE = '__session';
const ACCT_COOKIE    = '__acct';
const AUTH_PATHS     = new Set(['/login', '/register', '/forgot-password']);

/**
 * Prevent Next.js from caching middleware responses.
 * Without this, a stale "redirect to /login" can be served from cache
 * even after the __session cookie has been set — causing a redirect loop.
 */
function withNoCache(response: NextResponse): NextResponse {
  response.headers.set('x-middleware-cache', 'no-cache');
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = !!request.cookies.get(SESSION_COOKIE)?.value;
  const acct       = request.cookies.get(ACCT_COOKIE)?.value; // 'investor' | 'vendor'

  // ── Guest Portal — always public ──────────────────────
  if (pathname.startsWith('/invest')) {
    return withNoCache(NextResponse.next());
  }

  // ── Vendor Portal ──────────────────────────────────────
  if (pathname.startsWith('/vendor-portal')) {
    if (!hasSession) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirectTo', pathname);
      return withNoCache(NextResponse.redirect(url));
    }
    if (acct === 'investor') {
      return withNoCache(NextResponse.redirect(new URL('/dashboard', request.url)));
    }
    return withNoCache(NextResponse.next());
  }

  // ── Dashboard ──────────────────────────────────────────
  if (pathname.startsWith('/dashboard')) {
    if (!hasSession) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search);
      return withNoCache(NextResponse.redirect(url));
    }
    if (acct === 'vendor') {
      return withNoCache(NextResponse.redirect(new URL('/vendor-portal', request.url)));
    }
    return withNoCache(NextResponse.next());
  }

  // ── Auth pages — server-redirect only when redirectTo is explicit ──
  // Without a redirectTo param, the client-side login page handles the
  // redirect — it has access to sessionStorage (pw_pending_plan,
  // pw_auth_redirect) which the edge layer cannot read.
  if (AUTH_PATHS.has(pathname) && hasSession) {
    const redirectTo = request.nextUrl.searchParams.get('redirectTo');
    if (redirectTo && redirectTo.startsWith('/') && !AUTH_PATHS.has(redirectTo)) {
      return withNoCache(NextResponse.redirect(new URL(redirectTo, request.url)));
    }
  }

  return withNoCache(NextResponse.next());
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/vendor-portal/:path*',
    '/login',
    '/register',
    '/forgot-password',
    '/invest/:path*',
  ],
};
