import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/session-cookies';
import { shouldBlockWave2Path } from '@/lib/launch/wave2-scope';

/**
 * File extension allowlist for static assets that should bypass middleware gating.
 * Prevents false-positive bypasses on URL slugs containing dots (e.g. /projects/my-project.v2).
 */
const STATIC_ASSET_REGEX =
  /\.(?:ico|png|jpg|jpeg|svg|webp|gif|css|js|map|woff|woff2|ttf|eot|otf|json|txt|xml|pdf)$/i;

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/.well-known') ||
    STATIC_ASSET_REGEX.test(pathname)
  );
}

/**
 * Server-side auth gate (V1) plus the v0 production launch gate for Wave-2
 * reserved routes that are not Nest-backed.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Production launch gate: block Wave-2 reserved routes that are not Nest-backed.
  if (shouldBlockWave2Path(pathname, process.env.NODE_ENV)) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.searchParams.set('wave2', 'unavailable');
    return NextResponse.redirect(url);
  }

  // Explicit carve-out: never gate /login, /api/auth, Next.js assets, or static files
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    isStaticAsset(pathname)
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE)?.value;

  // Handle protected API routes: return 401 structured JSON envelope rather than redirect
  if (pathname.startsWith('/api/')) {
    if (
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/api/health') ||
      pathname.startsWith('/api/ready') ||
      pathname.startsWith('/api/webhooks') ||
      pathname.startsWith('/api/contact') ||
      pathname.startsWith('/api/support') ||
      pathname.startsWith('/api/marketplace') ||
      pathname.startsWith('/api/places') ||
      pathname.startsWith('/api/deal-calculator') ||
      pathname.startsWith('/api/deal-analyzer') ||
      pathname.startsWith('/api/dev')
    ) {
      return NextResponse.next();
    }

    if (!session) {
      const traceId = crypto.randomUUID();
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required.',
            traceId,
          },
        },
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'X-Trace-Id': traceId,
          },
        },
      );
    }

    return NextResponse.next();
  }

  if (!session) {
    const nextDestination = encodeURIComponent(pathname + search);
    const loginUrl = pathname.startsWith('/admin')
      ? new URL(`/login?accountType=admin&next=${nextDestination}`, request.url)
      : new URL(`/login?next=${nextDestination}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Preserve the resolved deep path on request headers for downstream server layouts
  const requestHeaders = new Headers(request.headers);
  const resolvedPath = pathname + search;
  requestHeaders.set('x-pathname', resolvedPath);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/dashboard',
    '/projects/:path*',
    '/projects',
    '/project/:path*',
    '/admin/:path*',
    '/vendor-portal/:path*',
    '/deal-calculator',
    '/deal-calculator/:path*',
    '/api/:path*',
    '/dashboard/banking/:path*',
    '/dashboard/plaid/:path*',
    '/dashboard/integrations/:path*',
    '/dashboard/esign/:path*',
    '/dashboard/drive/:path*',
    '/dashboard/capital-stack/:path*',
    '/dashboard/loans/:path*',
    '/dashboard/lender-package/:path*',
    '/dashboard/reconciliations/:path*',
    '/dashboard/financial/:path*',
    '/dashboard/tax/:path*',
    '/dashboard/reil/:path*',
    '/integrations/:path*',
    '/plaid/:path*',
    '/banking/:path*',
  ],
};
