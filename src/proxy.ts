import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireSubscriber, UserContext } from './middleware/requireSubscriber';
import { requireNonVendor, isVendorUser } from './middleware/requireNonVendor';

/* ═══════════════════════════════════════════════════════
   Auth Guard & Proxy Middleware (Next.js 16+)
   Single Source of Truth: src/proxy.ts

   Runs in the edge runtime before every matched route.
   Consolidates session auth, role gating, deals marketplace subscription checks,
   and legacy middleware route protection.
   ═══════════════════════════════════════════════════════ */

const SESSION_COOKIE = '__session';
const ACCT_COOKIE    = '__acct';
const SUB_COOKIE     = '__sub';
const AUTH_PATHS     = new Set(['/login', '/register', '/forgot-password']);

/**
 * Extract user authorization & subscription context from request headers and cookies.
 */
export function getUserContextFromRequest(req: NextRequest): UserContext {
  // Check custom headers first (useful for API & automated tests)
  const headerRole = req.headers.get('x-user-role') || req.headers.get('x-test-role');
  const headerAccountType = req.headers.get('x-account-type') || req.headers.get('x-test-account-type');
  const headerSubStatus = req.headers.get('x-subscription-status') || req.headers.get('x-test-subscription-status');

  // Check cookies second (for browser & E2E session state)
  const cookieRole = req.cookies.get('mock_user_role')?.value || req.cookies.get('user_role')?.value || req.cookies.get('__acct')?.value;
  const cookieAccountType = req.cookies.get('mock_user_account_type')?.value || req.cookies.get('account_type')?.value;
  const cookieSubStatus = req.cookies.get('mock_user_subscription_status')?.value || req.cookies.get('subscription_status')?.value;

  const role = headerRole || cookieRole || 'investor';
  const accountType = headerAccountType || cookieAccountType || role;

  // Default subscriptionStatus to 'active' if no explicit mock/cookie/header overrides it
  let subscriptionStatus = headerSubStatus || cookieSubStatus;
  if (!subscriptionStatus) {
    // If explicit headerRole/headerSubStatus or cookie is absent, default to 'active' for standard requests
    subscriptionStatus = 'active';
  }

  return {
    role,
    accountType,
    subscriptionStatus,
  };
}

/**
 * Decodes the non-HttpOnly `__sub` cookie set by /api/auth/session
 * (base64 JSON `{ plan, status }`) and reports whether it reflects an
 * active or trialing subscription.
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
  const user       = getUserContextFromRequest(request);

  // ── 1. Local Development Bypass ──────────────────────────
  if (!hasSession && (pathname.startsWith('/admin') || pathname.startsWith('/dashboard') || pathname.startsWith('/vendor-portal') || pathname.startsWith('/onboarding') || pathname === '/login')) {
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
        maxAge: 60 * 60 * 24 * 14,
        httpOnly: false,
      });
      response.cookies.set('mock_user_role', 'Platform Admin', {
        path: '/',
        maxAge: 60 * 60 * 24 * 14,
        httpOnly: false,
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

  // ── 1.5. Platform Admin Page Tree Server Protection ───────
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!hasSession) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search);
      return withNoCache(NextResponse.redirect(url));
    }

    const normalizedRole = (user.role || '').toLowerCase();
    const normalizedAccount = (user.accountType || '').toLowerCase();
    const isAdminRole =
      normalizedRole === 'platform admin' ||
      normalizedRole === 'admin' ||
      normalizedRole === 'lead investor' ||
      normalizedRole === 'superuser' ||
      normalizedAccount === 'platform admin' ||
      normalizedAccount === 'admin';

    if (!isAdminRole) {
      return withNoCache(
        new NextResponse('403 Forbidden. Admin privileges required.', {
          status: 403,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        })
      );
    }

    return withNoCache(nextWithHeader(request, pathname));
  }

  // ── 2. Data Room Deprecation Redirect (NAV-04) ───────────
  if (pathname === '/dashboard/data-room' || pathname.startsWith('/dashboard/data-room/')) {
    return withNoCache(NextResponse.redirect(new URL('/dashboard/projects', request.url), 301));
  }

  // ── 3. /dashboard/deals and /dashboard/deals/* (In-App Dashboard Deals Surface) ──
  if (pathname === '/dashboard/deals' || pathname.startsWith('/dashboard/deals/')) {
    if (!hasSession) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search);
      return withNoCache(NextResponse.redirect(url));
    }
    if (acct === 'vendor' || isVendorUser(user)) {
      return withNoCache(NextResponse.redirect(new URL('/dashboard/marketplace', request.url)));
    }
    return withNoCache(nextWithHeader(request, pathname));
  }

  // ── 4. /deals and /deals/* (Standalone Deals Marketplace Surface) ──
  if (pathname === '/deals' || pathname.startsWith('/deals/')) {
    // Check Vendor Isolation (Vendors cannot access Deals Marketplace)
    const vendorGate = requireNonVendor(request, user);
    if (vendorGate) return withNoCache(vendorGate);

    // Check Subscriber Gate (Unsubscribed users get 403 JSON)
    const subscriberGate = requireSubscriber(request, user);
    if (subscriberGate) return withNoCache(subscriberGate);

    // Direct Access to /deals/[slug] tracking
    const pathParts = pathname.split('/').filter(Boolean);
    const isDirectSlugAccess = pathParts[0] === 'deals' && pathParts.length > 1;
    const referer = request.headers.get('referer') || '';
    const cameFromPortfolio = referer.includes('/portfolio') || referer.includes('/dashboard/command-center');

    const res = nextWithHeader(request, pathname);
    if (isDirectSlugAccess && !cameFromPortfolio) {
      res.headers.set('x-marketplace-direct-access', 'true');
    }

    return withNoCache(res);
  }

  // ── 5. Vendor Marketplace Route Protection ───────────────
  if (pathname.startsWith('/vendor/marketplace')) {
    return withNoCache(nextWithHeader(request, pathname));
  }

  // ── 6. Guest Portal — always public ──────────────────────
  if (pathname.startsWith('/invest')) {
    return withNoCache(nextWithHeader(request, pathname));
  }

  // ── 7. Vendor Portal ──────────────────────────────────────
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

  // ── 8. Projects ───────────────────────────────────────────
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

  // ── 9. Dashboard Public Teasers & Auth Checks ────────────
  if (pathname === '/dashboard/marketplace') {
    if (!hasSession) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search);
      return withNoCache(NextResponse.redirect(url));
    }
    return withNoCache(nextWithHeader(request, pathname));
  }

  // ── 10. Dashboard General ─────────────────────────────────
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

  // ── 11. Pricing — subscribed users sent to portfolio ────
  if (pathname === '/pricing' && hasSession && hasActiveSubscription(request)) {
    return withNoCache(NextResponse.redirect(new URL('/dashboard', request.url)));
  }

  // ── 12. Auth pages — server-redirect when redirectTo is explicit ──
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
    '/admin',
    '/admin/:path*',
    '/dashboard/:path*',
    '/projects/:path*',
    '/vendor-portal/:path*',
    '/pricing',
    '/onboarding/:path*',
    '/login',
    '/register',
    '/forgot-password',
    '/invest/:path*',
    '/deals',
    '/deals/:path*',
    '/vendor/marketplace',
    '/vendor/marketplace/:path*',
  ],
};
