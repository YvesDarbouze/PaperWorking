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
const AUTH_PATHS = new Set(['/login', '/register', '/forgot-password']);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get(SESSION_COOKIE)?.value;

  // ── Guest Portal — always public ──────────────────
  if (pathname.startsWith('/invest')) {
    return NextResponse.next();
  }

  // ── Dashboard guard — require session ─────────────
  if (pathname.startsWith('/dashboard')) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // ── Auth pages — bounce authenticated users ───────
  if (AUTH_PATHS.has(pathname) && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/register',
    '/forgot-password',
    '/invest/:path*',
  ],
};
