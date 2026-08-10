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
   4. /pricing — an already-subscribed, logged-in user is bounced to the
      dashboard instead of seeing the plan picker (__sub cookie)
   5. /invest/* and all public routes — pass through untouched
   ═══════════════════════════════════════════════════════ */

const SESSION_COOKIE = '__session';
const ACCT_COOKIE    = '__acct';
const SUB_COOKIE     = '__sub';
const AUTH_PATHS     = new Set(['/login', '/register', '/forgot-password']);

/**
 * Decodes the non-HttpOnly `__sub` cookie set by /api/auth/session
 * (base64 JSON `{ plan, status }`) and reports whether it reflects an
 * active or trialing subscription. Never throws — a missing/malformed
 * cookie is simply treated as "not subscribed".
 */
function hasActiveSubscription(request: NextRequest): boolean {
  const raw = request.cookies.get(SUB_COOKIE)?.value;
  if (!raw) return false;
  try {
    const { status } = JSON.parse(atob(raw));
    return status === 'active' || status === 'trialing';
  } catch {
    return false;
  }
}

/**
 * Prevent Next.js from caching middleware responses.
 * Without this, a stale "redirect to /login" can be served from cache
 * even after the __session cookie has been set — causing a redirect loop.
 */
function withNoCache(response: NextResponse): NextResponse {
  response.headers.set('x-middleware-cache', 'no-cache');
  return response;
}

function nextWithHeader(request: NextRequest, pathname: string): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    }
  });
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = !!request.cookies.get(SESSION_COOKIE)?.value;
  const acct       = request.cookies.get(ACCT_COOKIE)?.value; // 'investor' | 'vendor'

  // ── Local Development Bypass ──────────────────────────
  if (!hasSession && (pathname.startsWith('/dashboard') || pathname.startsWith('/vendor-portal') || pathname.startsWith('/onboarding') || pathname === '/login')) {
    const isE2E = request.cookies.get('__e2e_test')?.value === '1';
    if (!isE2E &&
        process.env.NODE_ENV === 'development' && 
        process.env.ENABLE_MOCK_AUTH === 'true' &&
        (request.headers.get('host')?.startsWith('localhost') || 
         request.headers.get('host')?.startsWith('127.0.0.1'))) {
      console.warn('[SECURITY] Setting mock session cookie — localhost dev only');
      const url = request.nextUrl.clone();
      if (pathname === '/login') {
        url.pathname = '/dashboard/command-center';
      }
      const response = NextResponse.redirect(url);
      response.cookies.set(SESSION_COOKIE, 'mock_session_token_123', {
        path: '/',
        maxAge: 60 * 60 * 24 * 14, // 14 days
        httpOnly: false, // Must be accessible client-side by useAuth() check!
      });
      if (!acct) {
        response.cookies.set(ACCT_COOKIE, 'investor', {
          path: '/',
          maxAge: 60 * 60 * 24 * 14,
          httpOnly: false,
        });
      }
      return withNoCache(response);
    }
  }

  // ── Guest Portal — always public ──────────────────────
  if (pathname.startsWith('/invest')) {
    return withNoCache(nextWithHeader(request, pathname));
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
    return withNoCache(nextWithHeader(request, pathname));
  }

  // ── Projects ───────────────────────────────────────────
  if (pathname.startsWith('/projects')) {
    if (!hasSession) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search);
      return withNoCache(NextResponse.redirect(url));
    }
    if (acct === 'vendor') {
      return withNoCache(NextResponse.redirect(new URL('/vendor-portal', request.url)));
    }
    return withNoCache(nextWithHeader(request, pathname));
  }

  // ── Data Room Deprecation Redirect (NAV-04) ───────────
  if (pathname === '/dashboard/data-room' || pathname.startsWith('/dashboard/data-room/')) {
    return withNoCache(NextResponse.redirect(new URL('/dashboard/projects', request.url), 301));
  }

  // ── Deals Marketplace Role Gating ──────────────────────
  if (pathname.startsWith('/dashboard/deals')) {
    if (acct === 'vendor') {
      return withNoCache(NextResponse.redirect(new URL('/dashboard/marketplace', request.url)));
    }
  }

  // ── Dashboard Public Teasers (SEO/Marketing) ───────────
  if (pathname === '/dashboard/marketplace' || pathname === '/dashboard/deals') {
    if (!hasSession) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search);
      return withNoCache(NextResponse.redirect(url));
    }
    return withNoCache(nextWithHeader(request, pathname));
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
    return withNoCache(nextWithHeader(request, pathname));
  }

  // ── Pricing — an already-subscribed, logged-in user never needs the
  // plan picker; send them straight to their portfolio instead. ──────
  if (pathname === '/pricing' && hasSession && hasActiveSubscription(request)) {
    return withNoCache(NextResponse.redirect(new URL('/dashboard', request.url)));
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

  return withNoCache(nextWithHeader(request, pathname));
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/projects/:path*',
    '/vendor-portal/:path*',
    '/pricing',
    '/onboarding/:path*',
    '/login',
    '/register',
    '/forgot-password',
    '/invest/:path*',
  ],
};
