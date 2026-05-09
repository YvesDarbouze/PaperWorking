import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/* ═══════════════════════════════════════════════════════
   Proxy — Server-Side Auth Guard (Next.js 16+)

   Replaces the deprecated middleware.ts file convention.
   Runs at the edge before routes are rendered.

   1. Protects /dashboard/* routes — redirects to /login
      if the __session cookie is missing.
   2. Redirects already-authenticated users away from
      auth pages (/login, /register, /forgot-password).
   3. Passes /invest/* (Guest Portal) through untouched.
   ═══════════════════════════════════════════════════════ */

const SESSION_COOKIE = '__session';
const ACCT_COOKIE    = '__acct';
const AUTH_PATHS = new Set(['/login', '/register', '/forgot-password']);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const acct    = request.cookies.get(ACCT_COOKIE)?.value; // 'investor' | 'vendor'

  // ── Guest Portal — always public ──────────────────
  if (pathname.startsWith('/invest')) {
    return NextResponse.next();
  }

  // ── Vendor Portal guard ────────────────────────────
  if (pathname.startsWith('/vendor-portal')) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Investors who navigate directly to /vendor-portal get bounced back
    if (acct === 'investor') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // ── Dashboard guard — require session, block vendors ──
  if (pathname.startsWith('/dashboard')) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
    // Vendor accounts are not allowed inside the investor dashboard
    if (acct === 'vendor') {
      return NextResponse.redirect(new URL('/vendor-portal', request.url));
    }
    return NextResponse.next();
  }

  // ── Auth pages — bounce authenticated users ───────
  if (AUTH_PATHS.has(pathname) && session) {
    const dest = acct === 'vendor' ? '/vendor-portal' : '/dashboard';
    return NextResponse.redirect(new URL(dest, request.url));
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
