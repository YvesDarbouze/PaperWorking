import { FinancialTransactionCategory, FinancialTransactionDirection } from '@prisma/client';

/**
 * Maps the legacy `reiCategory` strings produced by classifier.ts to the new
 * canonical `FinancialTransactionCategory` enum used by FinancialTransaction.
 *
 * Also derives the money direction (CREDIT = income, DEBIT = expense/liability/transfer).
 * Keeps the v1 sync pipeline fully decoupled — classifier.ts is NOT modified.
 */

export interface BridgeResult {
  category: FinancialTransactionCategory;
  direction: FinancialTransactionDirection;
  taxTreatment?: string;
}

const REI_CATEGORY_MAP: Record<string, BridgeResult> = {
  // ── REVENUE ──────────────────────────────────────────────────────────────────
  rental_income:       { category: 'RENT_INCOME',               direction: 'CREDIT' },
  late_fees:           { category: 'LATE_FEE_INCOME',           direction: 'CREDIT' },
  pet_rent:            { category: 'PET_RENT_INCOME',           direction: 'CREDIT' },
  parking:             { category: 'PARKING_INCOME',            direction: 'CREDIT' },
  laundry_vending:     { category: 'LAUNDRY_VENDING_INCOME',    direction: 'CREDIT' },
  application_fees:    { category: 'APPLICATION_FEE_INCOME',    direction: 'CREDIT' },

  // ── EXPENSES ─────────────────────────────────────────────────────────────────
  property_tax:        { category: 'PROPERTY_TAX',              direction: 'DEBIT', taxTreatment: 'DEDUCTIBLE' },
  insurance:           { category: 'PROPERTY_INSURANCE',        direction: 'DEBIT', taxTreatment: 'DEDUCTIBLE' },
  hoa_fees:            { category: 'HOA_FEES',                  direction: 'DEBIT', taxTreatment: 'DEDUCTIBLE' },
  property_management: { category: 'MANAGEMENT_FEES',           direction: 'DEBIT', taxTreatment: 'DEDUCTIBLE' },
  maintenance:         { category: 'MAINTENANCE_REPAIR',        direction: 'DEBIT', taxTreatment: 'DEDUCTIBLE' },
  utilities:           { category: 'UTILITIES',                 direction: 'DEBIT', taxTreatment: 'DEDUCTIBLE' },
  rehab_staging:       { category: 'CLEANING_TURNOVER',         direction: 'DEBIT', taxTreatment: 'CAPITAL_IMPROVEMENT' },
  closing_costs:       { category: 'LEGAL_PROFESSIONAL',        direction: 'DEBIT', taxTreatment: 'DEDUCTIBLE' },
  legal_professional:  { category: 'LEGAL_PROFESSIONAL',        direction: 'DEBIT', taxTreatment: 'DEDUCTIBLE' },

  // ── LIABILITY (debt service) ──────────────────────────────────────────────────
  debt_service:        { category: 'MORTGAGE_PRINCIPAL',        direction: 'DEBIT', taxTreatment: 'LIABILITY' },
  escrow:              { category: 'MORTGAGE_ESCROW_PAYMENT',   direction: 'DEBIT', taxTreatment: 'LIABILITY' },

  // ── TRANSFERS / NON-P&L ───────────────────────────────────────────────────────
  security_deposit:    { category: 'SECURITY_DEPOSIT_RECEIVED', direction: 'CREDIT' },
  owner_draw:          { category: 'OWNER_DISTRIBUTION',        direction: 'DEBIT' },
  capex_reserve:       { category: 'CAPITAL_EXPENDITURE',       direction: 'DEBIT', taxTreatment: 'CAPITAL_IMPROVEMENT' },
  bank_transfer:       { category: 'INTER_ACCOUNT_TRANSFER',    direction: 'DEBIT' },
};

/**
 * Bridges a classifier result to the new FinancialTransaction schema.
 * Falls back to UNCATEGORIZED for any unknown reiCategory.
 *
 * @param reiCategory  - Output of classifyTransaction().reiCategory
 * @param plaidAmount  - Raw Plaid amount (positive = debit/expense, negative = credit/income per Plaid convention)
 */
export function bridgeCategory(
  reiCategory: string,
  plaidAmount?: number
): BridgeResult {
  const mapped = REI_CATEGORY_MAP[reiCategory];
  if (mapped) return mapped;

  // Infer direction from Plaid amount sign if available
  // Plaid: positive = money out (debit), negative = money in (credit)
  const direction: FinancialTransactionDirection =
    plaidAmount !== undefined && plaidAmount < 0 ? 'CREDIT' : 'DEBIT';

  return { category: 'UNCATEGORIZED', direction };
}

/**
 * Converts a raw Plaid transaction amount to an absolute Decimal-compatible string.
 * Plaid signs: positive = debit (money leaves account), negative = credit (money enters).
 *
 * FinancialTransaction.amount is always POSITIVE; direction is stored separately.
 */
export function normalizeAmount(plaidAmount: number): {
  absoluteAmount: string;
  direction: FinancialTransactionDirection;
} {
  return {
    absoluteAmount: Math.abs(plaidAmount).toFixed(2),
    direction: plaidAmount >= 0 ? 'DEBIT' : 'CREDIT',
  };
}
