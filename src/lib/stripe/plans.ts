/**
 * Canonical Plan Catalog — Single Source of Truth
 *
 * Used by:
 *   - /api/stripe/checkout      (price ID resolution)
 *   - /api/stripe/webhook       (plan metadata sync)
 *   - PricingCards.tsx           (display data)
 *   - PricingSection.tsx         (landing page display data)
 *   - SubscriptionGate.tsx       (price microcopy)
 */

/* ═══════════════════════════════════════════════════════
   Plan Identifiers
   ═══════════════════════════════════════════════════════ */

/**
 * Canonical plan IDs stored in Firestore and Stripe metadata.
 * These NEVER change once set — they are the system-of-record values.
 */
export type PlanId = 'individual' | 'team' | 'vendor' | 'lawyer';

export type BillingInterval = 'monthly' | 'annual';

export interface PlanConfig {
  id: PlanId;
  /** Canonical name stored in Firestore `subscriptionPlan` */
  canonicalName: string;
  /** Human-readable display name */
  displayName: string;
  /** Monthly price in USD (display only) */
  monthlyPrice: number;
  /** Annual price in USD (display only) */
  annualPrice: number;
  /** Trial period in days (0 = no trial) */
  trialDays: number;
  /** Environment variable names for Stripe Price IDs */
  envVars: {
    monthly: string[];
    annual: string[];
  };
}

/* ═══════════════════════════════════════════════════════
   Plan Definitions
   ═══════════════════════════════════════════════════════ */

export const PLAN_CATALOG: Record<PlanId, PlanConfig> = {
  individual: {
    id: 'individual',
    canonicalName: 'Individual',
    displayName: 'Individual Investor',
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
    displayName: 'Team / Firm',
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
    displayName: 'Vendor Network',
    monthlyPrice: 39,
    annualPrice: 390,
    trialDays: 14,
    envVars: {
      monthly: ['STRIPE_PRICE_VENDOR_MONTHLY', 'STRIPE_PRICE_VENDOR'],
      annual: ['STRIPE_PRICE_VENDOR_ANNUAL'],
    },
  },
  lawyer: {
    id: 'lawyer',
    canonicalName: 'Lawyer Lead-Gen',
    displayName: 'Lawyer',
    monthlyPrice: 59,
    annualPrice: 499,
    trialDays: 14,
    envVars: {
      monthly: ['STRIPE_PRICE_LAWYER_MONTHLY', 'STRIPE_PRICE_LAWYER'],
      annual: ['STRIPE_PRICE_LAWYER_ANNUAL'],
    },
  },
};

/* ═══════════════════════════════════════════════════════
   Display Name → Plan ID Resolution
   ═══════════════════════════════════════════════════════

   Maps every known display name and alias to a canonical
   PlanId. This handles the fact that landing page, pricing
   page, and CTA components may send different strings.
   ═══════════════════════════════════════════════════════ */

const DISPLAY_NAME_ALIASES: Record<string, PlanId> = {
  // Canonical IDs (self-referencing)
  'individual': 'individual',
  'team': 'team',
  'vendor': 'vendor',
  'lawyer': 'lawyer',

  // Landing page PricingSection display names
  'individual investor': 'individual',
  'team / firm': 'team',
  'team/firm': 'team',
  'vendor network': 'vendor',

  // PricingCards display names
  'investor team': 'team',

  // Legacy/alias names
  'lawyer lead-gen': 'lawyer',
};

/**
 * Resolves any plan name variant to a canonical PlanId.
 * Case-insensitive, trims whitespace.
 *
 * @returns The PlanId or null if unrecognized.
 */
export function resolvePlanId(input: string): PlanId | null {
  const normalized = input.trim().toLowerCase();
  return DISPLAY_NAME_ALIASES[normalized] ?? null;
}

/**
 * Resolves a Stripe Price ID from a plan name and billing interval.
 * Reads from environment variables defined in the plan's envVars config.
 *
 * @returns The first non-empty env var value, or null if none configured.
 */
export function resolveStripePriceId(
  planId: PlanId,
  interval: BillingInterval
): string | null {
  const plan = PLAN_CATALOG[planId];
  if (!plan) return null;

  const envVarNames = plan.envVars[interval];
  for (const envName of envVarNames) {
    const value = process.env[envName];
    if (value) return value;
  }
  return null;
}

/**
 * Gets the canonical plan name stored in Firestore from a PlanId.
 */
export function getCanonicalPlanName(planId: PlanId): string {
  return PLAN_CATALOG[planId]?.canonicalName ?? planId;
}

/**
 * Starting monthly price across all plans (for microcopy like "Starting at $X/mo")
 */
export const STARTING_PRICE = Math.min(
  ...Object.values(PLAN_CATALOG).map((p) => p.monthlyPrice)
);
