import { NextRequest, NextResponse } from 'next/server';

export interface UserContext {
  subscriptionStatus?: string;
  role?: string;
  accountType?: string;
  uid?: string;
  email?: string;
}

/**
 * Helper to check if a user has an active subscription status.
 */
export function checkSubscriberStatus(user?: UserContext | null): boolean {
  if (!user) return false;
  return user.subscriptionStatus === 'active';
}

/**
 * Middleware gate that checks subscriptionStatus === 'active'.
 * Returns HTTP 403 JSON response if not active, or null if allowed.
 */
export function requireSubscriber(req: NextRequest, user?: UserContext | null): NextResponse | null {
  const isSubscriber = checkSubscriberStatus(user);
  if (!isSubscriber) {
    return NextResponse.json(
      { error: 'Subscription required to access the Deals Marketplace.' },
      { status: 403 }
    );
  }
  return null;
}
