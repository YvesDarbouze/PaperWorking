import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { shouldBlockWave2Path } from '@/lib/launch/wave2-scope';

/**
 * Production launch gate: block Wave-2 reserved routes that are not Nest-backed.
 * Does not replace auth — only prevents accidental Wave-2 surface exposure.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (shouldBlockWave2Path(pathname, process.env.NODE_ENV)) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.searchParams.set('wave2', 'unavailable');
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
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
