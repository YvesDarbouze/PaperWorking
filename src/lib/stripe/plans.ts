/**
 * Canonical Plan Catalog — Single Source of Truth
 *
 * Prices mirror the actual Stripe product catalog (confirmed 2026-06-01):
 *   Vendor          → $39/mo  / $390/yr
 *   Investor        → $89/mo  / $890/yr
 *   Investment Team → $199/mo / $1,990/yr
 *
 * Used by:
 *   - /api/stripe/checkout      (price ID resolution)
 *   - /api/stripe/webhook       (plan metadata sync)
 *   - PricingCards.tsx          (display data)
 *   - PricingSection.tsx        (landing page display data)
 *   - SubscriptionGate.tsx      (price microcopy)
 */

/* ═══════════════════════════════════════════════════════
   Plan Identifiers
   ═══════════════════════════════════════════════════════ */

/**
 * Canonical plan IDs stored in Firestore and Stripe metadata.
 * These NEVER change once set — they are the system-of-record values.
 */
export type PlanId = 'individual' | 'team' | 'vendor';

export type BillingInterval = 'monthly' | 'annual';

export interface PlanConfig {
  id: PlanId;
  /** Canonical name stored in Firestore `subscriptionPlan` */
  canonicalName: string;
  /** Human-readable display name (matches Stripe product name) */
  displayName: string;
  /** Monthly price in USD — must match actual Stripe price object */
  monthlyPrice: number;
  /** Annual price in USD — must match actual Stripe price object */
  annualPrice: number;
  /** Trial period in days */
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
  /**
   * individual → Stripe product "Investor"
   * $89/mo / $890/yr
   */
  individual: {
    id: 'individual',
    canonicalName: 'Individual',
    displayName: 'Investor',
    monthlyPrice: 89,
    annualPrice: 890,
    trialDays: 14,
    envVars: {
      monthly: ['STRIPE_PRICE_INDIVIDUAL_MONTHLY', 'STRIPE_PRICE_INDIVIDUAL'],
      annual: ['STRIPE_PRICE_INDIVIDUAL_ANNUAL'],
    },
  },

  /**
   * team → Stripe product "Investment Team"
   * $199/mo / $1,990/yr
   */
  team: {
    id: 'team',
    canonicalName: 'Team',
    displayName: 'Investment Team',
    monthlyPrice: 199,
    annualPrice: 1990,
    trialDays: 14,
    envVars: {
      monthly: ['STRIPE_PRICE_TEAM_MONTHLY', 'STRIPE_PRICE_TEAM'],
      annual: ['STRIPE_PRICE_TEAM_ANNUAL'],
    },
  },

  /**
   * vendor → Stripe product "Vendor"
   * $39/mo / $390/yr
   */
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

/* ═══════════════════════════════════════════════════════
   Display Name → Plan ID Resolution

   Maps every known display name and alias to a canonical
   PlanId. Case-insensitive. Used by /api/stripe/checkout
   to resolve any string a pricing surface might send.
   ═══════════════════════════════════════════════════════ */

const DISPLAY_NAME_ALIASES: Record<string, PlanId> = {
  // Canonical plan IDs (self-referencing)
  'individual': 'individual',
  'team': 'team',
  'vendor': 'vendor',

  // Stripe product names (source of truth)
  'investor': 'individual',
  'investment team': 'team',
  'investment team plan': 'team',

  // Legacy and alternate display names (backward compat)
  'individual investor': 'individual',
  'solo': 'individual',
  'investor team': 'team',
  'team / firm': 'team',
  'team/firm': 'team',
  'vendor network': 'vendor',
  'vendor marketplace': 'vendor',
  'enterprise': 'team',
  'enterprise plan': 'team',

  // Lawyer is a marketplace-vendor role — route to vendor plan
  'lawyer': 'vendor',
  'lawyer lead-gen': 'vendor',
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
