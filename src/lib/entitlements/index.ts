/* ═══════════════════════════════════════════════════════
   Entitlements Engine — Client-Safe Shared Mappings
   ═══════════════════════════════════════════════════════ */

// ── Plan Identifiers ──
export type EntitlementPlanId = 'none' | 'vendor' | 'individual' | 'team';

// ── Feature Keys ──
export type FeatureKey =
  | 'unlimited_projects'
  | 'compare_board'
  | 'portfolio_rollups'
  | 'vendor_seats'
  | 'priority_support'
  | 'api_access'
  | 'white_label_export';

// ── Entitlements shape per plan ──
export interface PlanEntitlements {
  maxProjects: number;
  features: Set<FeatureKey>;
}

// ── Feature → human-readable name (for UI) ──
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  unlimited_projects: 'Unlimited Projects',
  compare_board: 'Compare Board',
  portfolio_rollups: 'Portfolio Roll-ups',
  vendor_seats: 'Vendor Seats',
  priority_support: 'Priority Support',
  api_access: 'API Access',
  white_label_export: 'White-Label Export',
};

// ── Feature → minimum plan required ──
export const FEATURE_MIN_PLAN: Record<FeatureKey, EntitlementPlanId> = {
  unlimited_projects: 'individual',
  compare_board: 'individual',
  portfolio_rollups: 'individual',
  vendor_seats: 'team',
  priority_support: 'team',
  api_access: 'team',
  white_label_export: 'team',
};

// ── Plan hierarchy (numeric levels for comparison) ──
export const PLAN_LEVEL: Record<EntitlementPlanId, number> = {
  none: 0,
  vendor: 1,
  individual: 2,
  team: 3,
};

// ── Plan → Entitlements mapping ──
const PLAN_ENTITLEMENTS: Record<EntitlementPlanId, PlanEntitlements> = {
  none: {
    maxProjects: 1,
    features: new Set([]),
  },
  vendor: {
    maxProjects: 1,
    features: new Set([]),
  },
  individual: {
    maxProjects: Infinity,
    features: new Set([
      'unlimited_projects',
      'compare_board',
      'portfolio_rollups',
    ]),
  },
  team: {
    maxProjects: Infinity,
    features: new Set([
      'unlimited_projects',
      'compare_board',
      'portfolio_rollups',
      'vendor_seats',
      'priority_support',
      'api_access',
      'white_label_export',
    ]),
  },
};

/**
 * Gets the entitlements object for a plan.
 */
export function getEntitlements(planId: EntitlementPlanId): PlanEntitlements {
  return PLAN_ENTITLEMENTS[planId];
}
