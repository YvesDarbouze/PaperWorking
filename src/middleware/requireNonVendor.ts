import { NextRequest, NextResponse } from 'next/server';
import { UserContext } from './requireSubscriber';

/**
 * Helper to check if a user is a Vendor account.
 */
export function isVendorUser(user?: UserContext | null): boolean {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  const accountType = (user.accountType || '').toLowerCase();
  return role === 'vendor' || accountType === 'vendor';
}

/**
 * Middleware gate that checks role !== 'vendor'.
 * Redirects vendors to /vendor/marketplace with a flash query parameter.
 * Flash message: "Vendor accounts can only see the Vendor's Marketplace. They cannot see the Deal's Marketplace."
 */
export function requireNonVendor(req: NextRequest, user?: UserContext | null): NextResponse | null {
  if (isVendorUser(user)) {
    const url = new URL('/vendor/marketplace', req.url);
    url.searchParams.set(
      'flash',
      "Vendor accounts can only see the Vendor's Marketplace. They cannot see the Deal's Marketplace."
    );
    return NextResponse.redirect(url);
  }
  return null;
}
