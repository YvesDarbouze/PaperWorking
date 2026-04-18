import { NextRequest, NextResponse } from 'next/server';

/* ═══════════════════════════════════════════════════════
   PaperWorking — Route Protection Middleware

   Two-layer check:
     1. Authentication  — requires __session cookie
     2. Subscription    — requires __sub cookie with
                          an active or trialing plan

   Cookie contract (set by /api/auth/session):
     __session  : HttpOnly, Firebase ID token
     __sub      : base64-encoded JSON { plan, status }

   Protected matchers:
     /dashboard/**          → auth required
     /share/**              → auth + active subscription
     /invite/**             → auth + active subscription
   ═══════════════════════════════════════════════════════ */

const AUTH_REQUIRED_PATHS = ['/dashboard', '/share', '/invite'];

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

// Subscription is required for shared-property and invite routes
const SUB_REQUIRED_PATHS = ['/share', '/invite'];

function decodeSubCookie(raw: string | undefined): { plan: string; status: string } | null {
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const needsAuth = AUTH_REQUIRED_PATHS.some((p) => pathname.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  // ── 1. Authentication check ──
  const sessionCookie = request.cookies.get('__session')?.value;
  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 2. Subscription check (share / invite routes) ──
  const needsSub = SUB_REQUIRED_PATHS.some((p) => pathname.startsWith(p));
  if (needsSub) {
    const subRaw = request.cookies.get('__sub')?.value;
    const sub    = decodeSubCookie(subRaw);

    if (!sub || !ACTIVE_STATUSES.has(sub.status)) {
      const pricingUrl = new URL('/pricing', request.url);
      pricingUrl.searchParams.set('reason', 'subscription_required');
      pricingUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(pricingUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/share/:path*',
    '/invite/:path*',
  ],
};
