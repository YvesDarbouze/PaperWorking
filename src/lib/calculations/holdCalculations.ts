/**
 * R3 — Hold Agent Calculations
 * 
 * Pure utility functions for:
 *  • Rehab tier → budget range mapping
 *  • Total monthly holding cost aggregation
 *  • Budget-vs-tier variance detection
 *  • Pre-1978 environmental property flag
 *  • Cumulative and projected hold cost computations
 */

import { ProjectFinancials, RehabTier } from '@/types/schema';

// ── Rehab Tier Budget Ranges ──────────────────────────────
// Industry-standard renovation cost brackets.
// These are template guides, not constraints.

export interface TierBudgetRange {
  low: number;
  high: number;
  label: string;
  emoji: string;
  description: string;
}

const TIER_BUDGET_MAP: Record<RehabTier, TierBudgetRange> = {
  'Stage': {
    low: 1_000,
    high: 5_000,
    label: 'Stage',
    emoji: '🛋️',
    description: 'Deep clean, paint touch-ups, staging furniture. Turnkey cosmetic.',
  },
  'Refurbish': {
    low: 5_000,
    high: 20_000,
    label: 'Refurbish',
    emoji: '🎨',
    description: 'Fresh paint, new fixtures, minor flooring. No permits needed.',
  },
  'Renovate': {
    low: 20_000,
    high: 100_000,
    label: 'Renovate',
    emoji: '🔧',
    description: 'Kitchen/bath refresh, new appliances, electrical panel. Permits needed.',
  },
  'Gut': {
    low: 100_000,
    high: 250_000,
    label: 'Gut',
    emoji: '💣',
    description: 'Down to studs. Full MEP, structural, layout changes. Major permits.',
  },
  'Develop': {
    low: 250_000,
    high: Infinity,
    label: 'Develop',
    emoji: '🏛️',
    description: 'Tear-down and rebuild. Full architectural plans, ground-up development.',
  },
};

/**
 * Get the template budget range and metadata for a rehab tier.
 */
export function getRehabTierBudgetRange(tier: RehabTier): TierBudgetRange {
  return TIER_BUDGET_MAP[tier];
}

/**
 * Get all tiers as an ordered array for rendering card pickers.
 */
export function getAllRehabTiers(): (TierBudgetRange & { tier: RehabTier })[] {
  const order: RehabTier[] = [
    'Stage',
    'Refurbish',
    'Renovate',
    'Gut',
    'Develop',
  ];
  return order.map(tier => ({ ...TIER_BUDGET_MAP[tier], tier }));
}

// ── Budget Variance Detection ─────────────────────────────

export interface BudgetVariance {
  isWithinRange: boolean;
  percentDeviation: number; // Positive = over high, Negative = under low
  warning: string | null;
}

/**
 * Compare user-entered budget against the tier template range.
 * Returns a variance analysis with optional warning text.
 */
export function computeRehabBudgetVariance(
  budget: number,
  tier: RehabTier | undefined
): BudgetVariance {
  if (!tier || budget <= 0) {
    return { isWithinRange: true, percentDeviation: 0, warning: null };
  }
  const range = TIER_BUDGET_MAP[tier];

  if (budget < range.low) {
    const pct = Math.round(((range.low - budget) / range.low) * 100);
    return {
      isWithinRange: false,
      percentDeviation: -pct,
      warning: `Budget is ${pct}% below the typical ${range.label} range ($${range.low.toLocaleString()}–$${range.high === Infinity ? '∞' : range.high.toLocaleString()}). Consider if this tier is correct.`,
    };
  }

  if (range.high !== Infinity && budget > range.high) {
    const pct = Math.round(((budget - range.high) / range.high) * 100);
    return {
      isWithinRange: false,
      percentDeviation: pct,
      warning: `Budget exceeds the ${range.label} range by ${pct}%. You may want to classify as a higher tier.`,
    };
  }

  return { isWithinRange: true, percentDeviation: 0, warning: null };
}

// ── Total Monthly Holding Cost ────────────────────────────

export interface MonthlyHoldCostBreakdown {
  taxes: number;
  insurance: number;
  security: number;
  utilities: number;
  hoa: number;
  maintenance: number;
  management: number;
  capex: number;
  loanCarry: number;
  total: number;
}

/**
 * Aggregate all monthly holding cost line items from financials.
 * Loan carry is computed from loanAmount × (interestRate / 100) / 12.
 */
export function computeTotalMonthlyHoldingCost(
  financials: Partial<ProjectFinancials>
): MonthlyHoldCostBreakdown {
  const taxes = financials.holdingCostTaxes || financials.holding_cost_tax || 0;
  const insurance = financials.holdingCostInsurance || financials.holding_cost_insurance || 0;
  const security = financials.holdingCostSecurity || financials.holding_cost_security || 0;
  const utilities = financials.holdingCostUtilities || financials.holding_cost_utilities || 0;
  const hoa = financials.monthlyHOA || financials.holding_cost_hoa || 0;
  const maintenance = financials.holdingCostMaintenance || financials.holding_cost_maintenance || 0;
  const management = financials.holdingCostManagement || financials.holding_cost_management || 0;
  const capex = financials.holdingCostCapex || financials.holding_cost_capex || 0;

  // Loan carry: interest-only monthly payment on hard money
  const loanAmount = financials.loanAmount || 0;
  const rate = financials.loanInterestRate || 0;
  const loanCarry = loanAmount > 0 && rate > 0
    ? Math.round((loanAmount * (rate / 100)) / 12)
    : 0;

  const total = taxes + insurance + security + utilities + hoa + maintenance + management + capex + loanCarry;

  return { taxes, insurance, security, utilities, hoa, maintenance, management, capex, loanCarry, total };
}

// ── Pre-1978 Environmental Check ──────────────────────────

/**
 * Properties built before 1978 require EPA lead paint disclosure
 * and may require asbestos testing per federal law.
 */
export function isPreWarProperty(yearBuilt: number | undefined): boolean {
  if (!yearBuilt || yearBuilt <= 0) return false;
  return yearBuilt < 1978;
}

// ── Hold Cost Projections ─────────────────────────────────

/**
 * Compute cumulative holding cost from hold start to now.
 */
export function computeHoldingCostToDate(
  monthlyHoldCost: number,
  holdStartDate: Date | undefined
): number {
  if (!holdStartDate || monthlyHoldCost <= 0) return 0;
  const start = new Date(holdStartDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  if (diffMs <= 0) return 0;
  const months = diffMs / (1000 * 60 * 60 * 24 * 30.44); // Average month
  return Math.round(monthlyHoldCost * months);
}

/**
 * Project total hold cost over a given number of months.
 */
export function computeProjectedTotalHoldCost(
  monthlyHoldCost: number,
  projectedMonths: number | undefined
): number {
  if (!projectedMonths || projectedMonths <= 0 || monthlyHoldCost <= 0) return 0;
  return Math.round(monthlyHoldCost * projectedMonths);
}

/**
 * Compute daily burn rate from total monthly hold cost.
 */
export function computeDailyBurnFromMonthly(monthlyTotal: number): number {
  return Math.round((monthlyTotal / 30.44) * 100) / 100;
}
