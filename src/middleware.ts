import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/* ═══════════════════════════════════════════════════════
   PaperWorking — Route Protection Middleware

   Directives 10 + 11:

   1. If an UNAUTHENTICATED user hits /dashboard/*,
      redirect instantly to /login.
   
   2. If an AUTHENTICATED user hits /login, /register,
      or /forgot-password, redirect instantly to /dashboard.
   
   Session is determined by the presence of the __session
   HttpOnly cookie, set by POST /api/auth/session after
   Firebase client-side authentication.
   ═══════════════════════════════════════════════════════ */

const SESSION_COOKIE_NAME = '__session';

// Routes that require authentication
const PROTECTED_ROUTES = ['/dashboard'];

// Routes that authenticated users should NOT see
const AUTH_ROUTES = ['/login', '/register', '/forgot-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = !!sessionCookie;

  // ─── Directive 10: Protect dashboard routes ───
  // Unauthenticated user → /dashboard/* → redirect to /login
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    // Preserve the intended destination so we can redirect back after login
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ─── Directive 11: Redirect authenticated users away from auth pages ───
  // Authenticated user → /login | /register | /forgot-password → redirect to /dashboard
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route);

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all dashboard routes
    '/dashboard/:path*',
    // Match auth routes
    '/login',
    '/register',
    '/forgot-password',
  ],
};
