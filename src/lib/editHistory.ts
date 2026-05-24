/**
 * R3 — Hold Agent: Edit History Utility
 * 
 * Builds field-level diff entries for the append-only holdEditHistory audit trail.
 * Compares old vs new values for a set of tracked financial fields and produces
 * HoldEditHistoryEntry records for any changes detected.
 */

import { HoldEditHistoryEntry, ProjectFinancials } from '@/types/schema';

/**
 * Tracked financial fields for edit history.
 * These are the Hold-phase fields that generate audit entries on change.
 */
export const HOLD_TRACKED_FIELDS: string[] = [
  // Rehab
  'rehabTier',
  'rehabBudget',
  'projectedRehabCost',
  'rehabActual',
  'actualRehabCost',
  'rehabDoneDate',
  'rehabTierBudgetLow',
  'rehabTierBudgetHigh',

  // Holding Costs
  'holdingCostTaxes',
  'holdingCostInsurance',
  'holdingCostUtilities',
  'monthlyHOA',
  'holdingCostMaintenance',
  'holdingCostManagement',
  'totalMonthlyHoldingCost',
  'holdStartDate',

  // Rental Operations
  'propertyManagementFee',
  'monthlyMaintenanceReserve',
  'actualRentalIncome',
  'otherMonthlyIncome',
  'daysOccupied',
  'occupiedUnits',

  // Valuation
  'estimatedCurrentValue',
];

/**
 * Compare old and new financials to produce field-level diff entries.
 * Only fields in HOLD_TRACKED_FIELDS that actually changed are included.
 * 
 * @param oldFinancials - The financial state before the edit
 * @param newFinancials - The financial state after the edit
 * @param uid - The UID of the user making the edit
 * @returns Array of HoldEditHistoryEntry for changed fields
 */
export const EXIT_TRACKED_FIELDS: string[] = [
  'exitType', 'actualSalePrice', 'sellingCosts', 'exitAttorneyFees', 'exitMarketingCost',
  'soldDate', 'listingDate', 'buyersAgentCommission', 'sellersAgentCommission',
  'finalClosingCosts', 'isStabilized', 'stabilizationDate', 'rentalMarketingCost',
  'refiLoanAmount', 'refiInterestRate', 'refiLoanTermYears', 'refiCashOut', 'refiDate',
  'marginalTaxBracket', 'estimatedCurrentValue'
];

export function buildEditHistoryEntries(
  oldFinancials: Partial<ProjectFinancials>,
  newFinancials: Partial<ProjectFinancials>,
  uid: string
): HoldEditHistoryEntry[] {
  const entries: HoldEditHistoryEntry[] = [];
  const now = new Date();

  for (const field of HOLD_TRACKED_FIELDS) {
    const oldVal = (oldFinancials as any)?.[field];
    const newVal = (newFinancials as any)?.[field];

    // Normalize for comparison: treat undefined/null/'' as equivalent
    const normalizedOld = normalizeValue(oldVal);
    const normalizedNew = normalizeValue(newVal);

    if (normalizedOld !== normalizedNew) {
      entries.push({
        field,
        oldValue: oldVal ?? null,
        newValue: newVal ?? null,
        editedAt: now,
        editedByUid: uid,
      });
    }
  }

  return entries;
}

/**
 * Compare old and new financials to produce field-level diff entries for Exit phase.
 * Only fields in EXIT_TRACKED_FIELDS that actually changed are included.
 */
export function buildExitEditHistoryEntries(
  oldFinancials: Partial<ProjectFinancials>,
  newFinancials: Partial<ProjectFinancials>,
  uid: string
): HoldEditHistoryEntry[] {
  const entries: HoldEditHistoryEntry[] = [];
  const now = new Date();

  for (const field of EXIT_TRACKED_FIELDS) {
    const oldVal = (oldFinancials as any)?.[field];
    const newVal = (newFinancials as any)?.[field];

    const normalizedOld = normalizeValue(oldVal);
    const normalizedNew = normalizeValue(newVal);

    if (normalizedOld !== normalizedNew) {
      entries.push({
        field,
        oldValue: oldVal ?? null,
        newValue: newVal ?? null,
        editedAt: now,
        editedByUid: uid,
      });
    }
  }

  return entries;
}

/**
 * Normalize a value for comparison.
 * Converts numbers to strings, treats empty string/undefined/null as 'null',
 * and handles Date objects.
 */
function normalizeValue(val: any): string {
  if (val === undefined || val === null || val === '') return 'null';

  // Handle Firestore Timestamps
  if (typeof val === 'object' && val.toDate) {
    return val.toDate().toISOString();
  }

  // Handle Date objects
  if (val instanceof Date) {
    return val.toISOString();
  }

  return String(val);
}
