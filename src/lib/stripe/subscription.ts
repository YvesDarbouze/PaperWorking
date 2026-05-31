/**
 * Subscription Feature Gating — Server + Client
 *
 * Per stripe-integration-expert skill: Feature gating should check
 * subscription status, handle grace periods, and provide clear
 * feedback when access is denied.
 *
 * Used by:
 *   - Middleware (route protection)
 *   - Dashboard components (conditional feature rendering)
 *   - API routes (server-side access control)
 */

import type { UserProfile } from '@/types/user';

/* ═══════════════════════════════════════════════════════
   Plan Tiers (ascending)
   ═══════════════════════════════════════════════════════ */
const PLAN_RANK: Record<string, number> = {
  None: 0,
  'Vendor Network': 1,
  Individual: 2,
  Team: 3,
};

/* ═══════════════════════════════════════════════════════
   Subscription Queries
   ═══════════════════════════════════════════════════════ */

/**
 * Returns true if the user has an active subscription (including trial
 * and past_due grace period).
 *
 * Grace period logic: A `past_due` subscription is still considered
 * active until the current billing period ends. This prevents
 * hard-locking users who have a temporary payment failure while
 * Stripe's automated retry system processes their dunning cycle.
 */
export function isSubscriptionActive(profile: UserProfile | null): boolean {
  if (!profile?.subscriptionStatus) return false;

  const status = profile.subscriptionStatus;
  if (status === 'active' || status === 'trialing') return true;

  // Grace period: past_due but billing period hasn't ended
  if (status === 'past_due') {
    const periodEnd = profile.currentPeriodEnd;
    if (periodEnd) {
      return new Date(periodEnd) > new Date();
    }
    // No period end recorded — be generous, assume grace
    return true;
  }

  return false;
}

/**
 * Returns true if the user's plan meets or exceeds the required tier.
 */
export function hasPlanAccess(profile: UserProfile | null, requiredPlan: string): boolean {
  if (!profile || !isSubscriptionActive(profile)) return false;

  const userRank = PLAN_RANK[profile.subscriptionPlan || 'None'] ?? 0;
  const requiredRank = PLAN_RANK[requiredPlan] ?? 0;

  return userRank >= requiredRank;
}

/**
 * Returns the user's subscription state for UI rendering.
 */
export function getSubscriptionState(profile: UserProfile | null): {
  isActive: boolean;
  isTrial: boolean;
  isPastDue: boolean;
  isCanceling: boolean;
  plan: string;
} {
  if (!profile) {
    return { isActive: false, isTrial: false, isPastDue: false, isCanceling: false, plan: 'None' };
  }

  return {
    isActive: isSubscriptionActive(profile),
    isTrial: profile.subscriptionStatus === 'trialing',
    isPastDue: profile.subscriptionStatus === 'past_due',
    isCanceling: !!profile.cancelAtPeriodEnd,
    plan: profile.subscriptionPlan || 'None',
  };
}
