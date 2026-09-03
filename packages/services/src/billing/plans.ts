/**
 * Canonical plan catalog — server-side price allowlist source.
 */

export type PlanId = 'individual' | 'team' | 'vendor';

export type BillingInterval = 'monthly' | 'annual';

export interface PlanConfig {
  id: PlanId;
  canonicalName: string;
  displayName: string;
  monthlyPrice: number;
  annualPrice: number;
  trialDays: number;
  envVars: {
    monthly: string[];
    annual: string[];
  };
}

export const PLAN_CATALOG: Record<PlanId, PlanConfig> = {
  individual: {
    id: 'individual',
    canonicalName: 'Individual',
    displayName: 'Investor',
    monthlyPrice: 59,
    annualPrice: 499,
    trialDays: 14,
    envVars: {
      monthly: ['STRIPE_PRICE_INDIVIDUAL_MONTHLY', 'STRIPE_PRICE_INDIVIDUAL'],
      annual: ['STRIPE_PRICE_INDIVIDUAL_ANNUAL'],
    },
  },
  team: {
    id: 'team',
    canonicalName: 'Team',
    displayName: 'Investment Team',
    monthlyPrice: 99,
    annualPrice: 999,
    trialDays: 14,
    envVars: {
      monthly: ['STRIPE_PRICE_TEAM_MONTHLY', 'STRIPE_PRICE_TEAM'],
      annual: ['STRIPE_PRICE_TEAM_ANNUAL'],
    },
  },
  vendor: {
    id: 'vendor',
    canonicalName: 'Vendor Network',
    displayName: 'Vendor',
    monthlyPrice: 39,
    annualPrice: 390,
    trialDays: 14,
    envVars: {
      monthly: ['STRIPE_PRICE_VENDOR_MONTHLY', 'STRIPE_PRICE_VENDOR'],
      annual: ['STRIPE_PRICE_VENDOR_ANNUAL'],
    },
  },
};

const DISPLAY_NAME_ALIASES: Record<string, PlanId> = {
  individual: 'individual',
  team: 'team',
  vendor: 'vendor',
  investor: 'individual',
  'investment team': 'team',
  'investment team plan': 'team',
  'individual investor': 'individual',
  solo: 'individual',
  'investor team': 'team',
  'team / firm': 'team',
  'team/firm': 'team',
  'vendor network': 'vendor',
  'vendor marketplace': 'vendor',
  enterprise: 'team',
  'enterprise plan': 'team',
  lawyer: 'vendor',
  'lawyer lead-gen': 'vendor',
};

export function resolvePlanId(input: string): PlanId | null {
  const normalized = input.trim().toLowerCase();
  return DISPLAY_NAME_ALIASES[normalized] ?? null;
}

export function resolveStripePriceId(planId: PlanId, interval: BillingInterval): string | null {
  const plan = PLAN_CATALOG[planId];
  if (!plan) return null;

  for (const envName of plan.envVars[interval]) {
    const value = process.env[envName];
    if (value) return value;
  }
  return null;
}

/** All configured Stripe price IDs from env (for client priceId validation). */
export function listConfiguredStripePriceIds(): Set<string> {
  const ids = new Set<string>();
  for (const plan of Object.values(PLAN_CATALOG)) {
    for (const interval of ['monthly', 'annual'] as const) {
      for (const envName of plan.envVars[interval]) {
        const value = process.env[envName];
        if (value) ids.add(value);
      }
    }
  }
  return ids;
}

export function validateAllowlistedPriceId(priceId: string): string | null {
  const trimmed = priceId.trim();
  if (!trimmed) return null;
  return listConfiguredStripePriceIds().has(trimmed) ? trimmed : null;
}

export function getCanonicalPlanName(planId: PlanId): string {
  return PLAN_CATALOG[planId]?.canonicalName ?? planId;
}

/** Reverse lookup: Stripe price ID → configured plan (env allowlist). */
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

/**
 * Stripe subscription.status → app status (matches StripeWebhookService updated/deleted paths).
 */
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

export const STARTING_PRICE = Math.min(...Object.values(PLAN_CATALOG).map((p) => p.monthlyPrice));
