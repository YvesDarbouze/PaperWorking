/**
 * Stripe subscription status → Firestore mapping.
 * Source: PaperWorking src/app/api/stripe/webhook/route.ts
 */
export const STRIPE_STATUS_MAP: Record<string, string> = {
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  canceled: 'canceled',
  unpaid: 'canceled',
  incomplete: 'incomplete',
  incomplete_expired: 'canceled',
  paused: 'paused',
};

export function mapStripeSubscriptionStatus(status: string): string {
  return STRIPE_STATUS_MAP[status] || 'inactive';
}
