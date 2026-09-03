/**
 * Stripe field mapping for Phase D linkage — mirrors @paperworking/services billing/plans
 * and StripeWebhookService status handling (no package import to avoid database↔services cycle).
 */

type PlanId = 'individual' | 'team' | 'vendor';

const PLAN_CATALOG: Record<
  PlanId,
  { canonicalName: string; envVars: { monthly: string[]; annual: string[] } }
> = {
  individual: {
    canonicalName: 'Individual',
    envVars: {
      monthly: ['STRIPE_PRICE_INDIVIDUAL_MONTHLY', 'STRIPE_PRICE_INDIVIDUAL'],
      annual: ['STRIPE_PRICE_INDIVIDUAL_ANNUAL'],
    },
  },
  team: {
    canonicalName: 'Team',
    envVars: {
      monthly: ['STRIPE_PRICE_TEAM_MONTHLY', 'STRIPE_PRICE_TEAM'],
      annual: ['STRIPE_PRICE_TEAM_ANNUAL'],
    },
  },
  vendor: {
    canonicalName: 'Vendor Network',
    envVars: {
      monthly: ['STRIPE_PRICE_VENDOR_MONTHLY', 'STRIPE_PRICE_VENDOR'],
      annual: ['STRIPE_PRICE_VENDOR_ANNUAL'],
    },
  },
};

export function resolvePlanFromStripePriceId(
  priceId: string,
): { planId: PlanId; canonicalName: string } | null {
  const trimmed = priceId.trim();
  if (!trimmed) return null;

  for (const planId of Object.keys(PLAN_CATALOG) as PlanId[]) {
    const plan = PLAN_CATALOG[planId];
    for (const interval of ['monthly', 'annual'] as const) {
      for (const envName of plan.envVars[interval]) {
        if (process.env[envName]?.trim() === trimmed) {
          return { planId, canonicalName: plan.canonicalName };
        }
      }
    }
  }
  return null;
}

/** Matches StripeWebhookService customer.subscription.updated/deleted mapping. */
export function mapStripeSubscriptionStatusForPersistence(
  stripeStatus: string,
  options?: { deleted?: boolean; existingStatus?: string | null },
): string {
  if (options?.deleted) return 'canceled';
  const status = stripeStatus.trim().toLowerCase();
  if (
    status === 'active' ||
    status === 'trialing' ||
    status === 'past_due' ||
    status === 'canceled'
  ) {
    return status;
  }
  return options?.existingStatus ?? 'inactive';
}
