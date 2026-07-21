/**
 * Hold Registry Migrations — Legacy-to-Canonical Mapping Utilities
 *
 * HD-3 · These utilities handle the migration from legacy field names
 * and values to the canonical Hold registry.
 *
 * DEFECT MAP (from HD-3 audit):
 *
 * 1. Renovation Tiers:
 *    Legacy:    'Staging' | 'Minor' | 'Rehab' | 'Gut' | 'Construction'
 *    Canonical: 'STAGE'  | 'REFURBISH' | 'RENOVATE' | 'GUT' | 'DEVELOP'
 *
 * 2. Expense Categories:
 *    Legacy:    'Property Tax' | 'Insurance' | 'Utilities' | 'HOA' | 'Loan Interest' | 'Other'
 *    Canonical: 'tax' | 'insurance' | 'security' | 'maintenance' | 'utilities' | 'management' | 'HOA' | 'capex'
 *
 * 3. Exit Strategy:
 *    Legacy:    'Sell' | 'Rent' | 'Fix & Flip' | 'Buy & Hold'
 *    Canonical: 'SALE' | 'RENT' | 'LEASE' (via disposition_type)
 *
 * 4. strategyType:
 *    Legacy field name — canonical is disposition_type.
 *    30+ occurrences in codebase; migration is incremental.
 */

import type { RenovationTier, HoldingCostCategory } from '@/lib/types/hold-registry';

// ── Renovation Tier Migration ────────────────────────────────────────────────

const LEGACY_TIER_MAP: Record<string, RenovationTier> = {
  'Staging':      'STAGE',
  'staging':      'STAGE',
  'Minor':        'REFURBISH',
  'minor':        'REFURBISH',
  'Rehab':        'RENOVATE',
  'rehab':        'RENOVATE',
  'Gut':          'GUT',
  'gut':          'GUT',
  'Construction': 'DEVELOP',
  'construction': 'DEVELOP',
  // Already canonical — pass through
  'STAGE':        'STAGE',
  'REFURBISH':    'REFURBISH',
  'RENOVATE':     'RENOVATE',
  'GUT':          'GUT',
  'DEVELOP':      'DEVELOP',
};

/**
 * Maps a legacy or canonical renovation tier string to the canonical enum.
 * Returns undefined for unrecognized values (caller must handle).
 */
export function migrateRenovationTier(legacy: string): RenovationTier | undefined {
  return LEGACY_TIER_MAP[legacy];
}

// ── Expense Category Migration ───────────────────────────────────────────────

const LEGACY_CATEGORY_MAP: Record<string, HoldingCostCategory | null> = {
  // Direct mappings
  'Property Tax':  'tax',
  'property_tax':  'tax',
  'Insurance':     'insurance',
  'insurance':     'insurance',
  'Utilities':     'utilities',
  'utilities':     'utilities',
  'HOA':           'HOA',
  'hoa':           'HOA',
  // Non-canonical → closest canonical
  'Loan Interest': null,  // Loan carry is DERIVED, not an expense category — drop
  'loan_interest': null,
  'Other':         null,  // No ninth category — must be manually re-categorized
  'other':         null,
  'housekeeping':  'maintenance', // housekeeping → maintenance per audit
  'otherCosts':    null,  // Must be manually re-categorized
  // Already canonical — pass through
  'tax':           'tax',
  'security':      'security',
  'maintenance':   'maintenance',
  'management':    'management',
  'capex':         'capex',
};

/**
 * Maps a legacy expense category to the canonical category.
 * Returns null for categories that have no canonical equivalent
 * (e.g., 'Loan Interest' — loan carry is derived, not an expense).
 */
export function migrateExpenseCategory(legacy: string): HoldingCostCategory | null {
  return LEGACY_CATEGORY_MAP[legacy] ?? null;
}

// ── Strategy Type Migration ──────────────────────────────────────────────────

export type DispositionType = 'SALE' | 'LEASE' | 'RENT';

const LEGACY_STRATEGY_MAP: Record<string, DispositionType> = {
  'Sell':         'SALE',
  'sell':         'SALE',
  'Fix & Flip':   'SALE',
  'fix_and_flip': 'SALE',
  'Rent':         'RENT',
  'rent':         'RENT',
  'Buy & Hold':   'RENT',
  'buy_and_hold': 'RENT',
  // Already canonical
  'SALE':         'SALE',
  'LEASE':        'LEASE',
  'RENT':         'RENT',
};

/**
 * Maps a legacy strategyType to the canonical disposition_type.
 * Returns undefined for unrecognized values.
 */
export function migrateStrategyType(legacy: string): DispositionType | undefined {
  return LEGACY_STRATEGY_MAP[legacy];
}

// ── Batch Migration Report ───────────────────────────────────────────────────

export interface MigrationDelta {
  field: string;
  legacyValue: string;
  canonicalValue: string | null;
  action: 'mapped' | 'dropped' | 'manual_review';
  note?: string;
}

/**
 * Generates a migration delta report for a project's Hold-related legacy fields.
 * Used by the migration script to log what was changed.
 */
export function generateMigrationReport(project: {
  rehabTier?: string;
  strategyType?: string;
  exitStrategyType?: string;
  holdingCosts?: Array<{ type?: string; label?: string; category?: string }>;
}): MigrationDelta[] {
  const deltas: MigrationDelta[] = [];

  // Renovation tier
  if (project.rehabTier) {
    const canonical = migrateRenovationTier(project.rehabTier);
    deltas.push({
      field: 'rehabTier → renovationTier',
      legacyValue: project.rehabTier,
      canonicalValue: canonical ?? null,
      action: canonical ? 'mapped' : 'manual_review',
      note: canonical ? undefined : `Unrecognized tier: ${project.rehabTier}`,
    });
  }

  // Strategy type
  if (project.strategyType) {
    const canonical = migrateStrategyType(project.strategyType);
    deltas.push({
      field: 'strategyType → disposition_type',
      legacyValue: project.strategyType,
      canonicalValue: canonical ?? null,
      action: canonical ? 'mapped' : 'manual_review',
    });
  }

  if (project.exitStrategyType) {
    const canonical = migrateStrategyType(project.exitStrategyType);
    deltas.push({
      field: 'exitStrategyType → disposition_type',
      legacyValue: project.exitStrategyType,
      canonicalValue: canonical ?? null,
      action: canonical ? 'mapped' : 'manual_review',
    });
  }

  // Holding cost categories
  if (project.holdingCosts) {
    for (const cost of project.holdingCosts) {
      const legacyCat = cost.type || cost.category || cost.label || 'unknown';
      const canonical = migrateExpenseCategory(legacyCat);
      deltas.push({
        field: `holdingCosts[].type → holdingCosts.${canonical || '?'}`,
        legacyValue: legacyCat,
        canonicalValue: canonical,
        action: canonical ? 'mapped' : (canonical === null ? 'dropped' : 'manual_review'),
        note: canonical === null ? 'No canonical equivalent — loan carry is derived, Other must be recategorized' : undefined,
      });
    }
  }

  return deltas;
}
