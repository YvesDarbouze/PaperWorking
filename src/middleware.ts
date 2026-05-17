import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/* ═══════════════════════════════════════════════════════
   Proxy — Server-Side Auth Guard (Next.js 16+)

   Replaces the deprecated middleware.ts file convention.
   Runs on the Node.js runtime before routes are rendered.

   1. Protects /dashboard/* routes — redirects to /login
      if the __session cookie is missing or expired.
   2. Redirects already-authenticated users away from
      auth pages (/login, /register, /forgot-password).
   3. Passes /invest/* (Guest Portal) through untouched.
   4. Decodes JWT claims (exp check) without signature
      verification — real auth lives in API routes and
      Firestore rules. Cookie is HttpOnly and only written
      by /api/auth/session after Admin SDK verification.
   ═══════════════════════════════════════════════════════ */

const SESSION_COOKIE = '__session';
const ACCT_COOKIE    = '__acct';
const AUTH_PATHS = new Set(['/login', '/register', '/forgot-password']);

/**
 * Decodes JWT claims without signature verification.
 * The __session cookie is HttpOnly and set exclusively by /api/auth/session,
 * which performs full Firebase Admin SDK verification before writing the cookie.
 * Middleware's job is gating (UX guard); real authorization lives in API routes
 * and Firestore security rules.
 *
 * We still reject tokens that are structurally invalid or expired so stale
 * cookies don't silently grant access after the 14-day max-age.
 */
function verifySessionToken(token: string): { uid: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Base64url → base64 → JSON
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(padded));

    if (!payload?.user_id && !payload?.sub && !payload?.uid) return null;
    if (payload.exp && Date.now() >= payload.exp * 1000) return null;

    const uid = payload.user_id || payload.sub || payload.uid;
    return { uid };
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  const acct         = request.cookies.get(ACCT_COOKIE)?.value; // 'investor' | 'vendor'

  // ── Guest Portal — always public ──────────────────
  if (pathname.startsWith('/invest')) {
    return NextResponse.next();
  }

  // ── Vendor Portal guard ────────────────────────────
  if (pathname.startsWith('/vendor-portal')) {
    if (!sessionToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verify the JWT is actually valid (not just present)
    const verified = verifySessionToken(sessionToken);
    if (!verified) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      loginUrl.searchParams.set('reason', 'session_expired');
      // Clear the stale cookie so client-side can re-auth cleanly
      const response = NextResponse.redirect(loginUrl);
      response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
      return response;
    }

    // Investors who navigate directly to /vendor-portal get bounced back
    if (acct === 'investor') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // ── Dashboard guard — require session, block vendors ──
  if (pathname.startsWith('/dashboard')) {
    if (!sessionToken) {
      console.warn(`[Proxy] No session token for ${pathname}`);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }

    // Verify the JWT is actually valid (not just present)
    const verified = verifySessionToken(sessionToken);
    if (!verified) {
      console.warn(`[Proxy] Invalid session token for ${pathname}, redirecting to login`);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search);
      loginUrl.searchParams.set('reason', 'session_expired');
      const response = NextResponse.redirect(loginUrl);
      response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
      return response;
    }

    // Vendor accounts are not allowed inside the investor dashboard
    if (acct === 'vendor') {
      return NextResponse.redirect(new URL('/vendor-portal', request.url));
    }
    return NextResponse.next();
  }

  // ── Auth pages — bounce authenticated users ───────
  // IMPORTANT: Only redirect from auth pages when a redirectTo param is
  // explicitly present. Otherwise, let the client-side login page handle
  // the redirect via its useEffect — it has access to sessionStorage
  // which may contain checkout intent (pw_pending_plan, pw_auth_redirect)
  // that the server-side proxy cannot read.
  if (AUTH_PATHS.has(pathname) && sessionToken) {
    const redirectTo = request.nextUrl.searchParams.get('redirectTo');
    if (redirectTo && redirectTo.startsWith('/') && !AUTH_PATHS.has(redirectTo)) {
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
    // No explicit redirectTo — let the client-side useEffect decide.
    // It will check: pw_pending_plan → pw_auth_redirect → /dashboard
  }

  return NextResponse.next();
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
