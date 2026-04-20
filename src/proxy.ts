import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_PATHS = new Set(['/login', '/register', '/forgot-password']);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get('__session')?.value;

  // Redirect already-authenticated users away from auth pages.
  // Dashboard protection is handled client-side in dashboard/layout.tsx
  // to avoid race conditions between Firebase Auth and the session cookie.
  if (AUTH_PATHS.has(pathname) && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/register', '/forgot-password'],
};
