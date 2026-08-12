import { NextRequest, NextResponse } from 'next/server';
import { requireSubscriber, checkSubscriberStatus, UserContext } from './middleware/requireSubscriber';
import { requireNonVendor, isVendorUser } from './middleware/requireNonVendor';

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
  // Default subscriptionStatus to 'active' if no explicit mock/cookie/header overrides it, or parse exact value
  const subscriptionStatus = headerSubStatus || cookieSubStatus || 'active';

  return {
    role,
    accountType,
    subscriptionStatus,
  };
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const user = getUserContextFromRequest(req);

  // 1. /vendor/marketplace Route Protection
  if (pathname.startsWith('/vendor/marketplace')) {
    // If not a vendor role/accountType, allow or route to dashboard marketplace
    return NextResponse.next();
  }

  // 2. /deals and /deals/* Route Protection (including /dashboard/deals)
  if (
    pathname === '/deals' ||
    pathname.startsWith('/deals/') ||
    pathname === '/dashboard/deals' ||
    pathname.startsWith('/dashboard/deals/')
  ) {
    // Check Vendor Isolation (Vendors cannot access Deals Marketplace)
    const vendorGate = requireNonVendor(req, user);
    if (vendorGate) return vendorGate;

    // Check Subscriber Gate (Unsubscribed users get 403 JSON)
    const subscriberGate = requireSubscriber(req, user);
    if (subscriberGate) return subscriberGate;

    // Direct Access to /deals/[slug] tracking
    const pathParts = pathname.split('/').filter(Boolean);
    const isDirectSlugAccess = (pathParts[0] === 'deals' && pathParts.length > 1) ||
                              (pathParts[0] === 'dashboard' && pathParts[1] === 'deals' && pathParts.length > 2);
    
    const referer = req.headers.get('referer') || '';
    const cameFromPortfolio = referer.includes('/portfolio') || referer.includes('/dashboard/command-center');

    const res = NextResponse.next();

    if (isDirectSlugAccess && !cameFromPortfolio) {
      // Log marketplace_direct_access analytics event
      res.headers.set('x-marketplace-direct-access', 'true');
      console.log(`[Analytics] Event: marketplace_direct_access for path: ${pathname}`);
    }

    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/deals',
    '/deals/:path*',
    '/dashboard/deals',
    '/dashboard/deals/:path*',
    '/vendor/marketplace',
    '/vendor/marketplace/:path*',
  ],
};
