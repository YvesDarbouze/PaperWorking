/** Free-tier plan ids — may use app without Stripe paid subscription. */
const FREE_PLANS = new Set(['individual', 'free', 'trial', 'none', '']);

export type SubscriptionSnapshot = {
  plan?: string | null;
  status?: string | null;
  stripeSubscriptionId?: string | null;
};

export function isFreePlan(planId: string | null | undefined): boolean {
  return FREE_PLANS.has(String(planId || '').trim().toLowerCase());
}

export function hasVerifiedPaidSubscription(sub: SubscriptionSnapshot): boolean {
  if (!sub.stripeSubscriptionId) return false;
  const status = (sub.status || '').trim().toLowerCase();
  return status === 'active' || status === 'trialing';
}

/**
 * Authoritative entitlement for app access / paid features.
 * Stripe webhook + Subscription row are source of truth — never cookies or client flags.
 */
export function hasActiveEntitlement(sub: SubscriptionSnapshot | null | undefined): boolean {
  if (!sub) return false;
  if (isFreePlan(sub.plan)) {
    const status = (sub.status || 'active').trim().toLowerCase();
    return status !== 'canceled';
  }
  if (hasVerifiedPaidSubscription(sub)) return true;
  const status = (sub.status || '').trim().toLowerCase();
  return status === 'active' || status === 'trialing';
}
