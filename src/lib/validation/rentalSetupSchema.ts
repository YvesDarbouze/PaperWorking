/**
 * ═══════════════════════════════════════════════════════════════
 * Rental Setup — Zod Validation Schema
 *
 * Strict input validation for the Phase 4 Rental Operations
 * Ledger. Every user-supplied field is validated with domain-
 * specific constraints before being persisted to Firestore.
 *
 * Enforces:
 *  • All monetary values are non-negative finite numbers
 *  • Percentage fields are capped at [0, 100]
 *  • Property manager contact info follows standard patterns
 *  • Derived metrics (NOI, Cap Rate, Cash-on-Cash) are
 *    recalculated server-side — never trusted from the client
 * ═══════════════════════════════════════════════════════════════
 */

import { z } from 'zod';

// ── Reusable Zod primitives ────────────────────────────────

/** Non-negative finite number (dollars or per-month amounts) */
const currencyField = z
  .number({ message: 'Must be a valid number' })
  .nonnegative('Amount cannot be negative')
  .finite('Amount must be finite');

/** Percentage in [0, 100] */
const percentageField = z
  .number({ message: 'Must be a valid number' })
  .min(0, 'Percentage cannot be negative')
  .max(100, 'Percentage cannot exceed 100')
  .finite('Must be finite');

// ── Primary Schema ─────────────────────────────────────────

export const rentalSetupSchema = z.object({
  // ── Revenue ──
  projectedMonthlyRent: currencyField.refine(
    (v) => v > 0,
    { message: 'Monthly rent must be greater than $0' }
  ),

  // ── Vacancy & OpEx ──
  vacancyRate: percentageField.default(5),
  maintenanceReserves: currencyField.default(0),
  propertyManagementFeePercent: percentageField.default(0),

  // ── Debt Service ──
  longTermMortgagePayment: currencyField.default(0),

  // ── Investor Cash Basis ──
  financingCashInvested: currencyField.default(0),

  // ── Leasing ──
  leasingFee: currencyField.optional(),

  // ── Property Manager Contact (optional enrichment) ──
  propertyManagerName: z
    .string()
    .max(120, 'Name is too long')
    .optional(),
  propertyManagerPhone: z
    .string()
    .regex(
      /^(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$/,
      'Enter a valid US phone number'
    )
    .optional()
    .or(z.literal('')),
  propertyManagerEmail: z
    .string()
    .email('Enter a valid email address')
    .optional()
    .or(z.literal('')),
});

export type RentalSetupInput = z.infer<typeof rentalSetupSchema>;

// ── Derived Metric Calculator (Pure) ───────────────────────

export interface RentalDerivedMetrics {
  vacancyLoss: number;
  effectiveGrossIncome: number;
  propertyManagementFeeValue: number;
  totalOperatingExpenses: number;
  netOperatingIncome: number;
  netCashFlow: number;
  annualNOI: number;
  capRate: number;
  cashOnCashReturn: number;
}

/**
 * Computes all derived rental metrics from validated input.
 * This is the **canonical** calculation — UI components must
 * delegate to this function rather than duplicating the math.
 *
 * @param input   - Validated rental setup fields
 * @param totalAllInCost - Sum of purchase + rehab + acquisition costs
 */
export function computeRentalMetrics(
  input: RentalSetupInput,
  totalAllInCost: number
): RentalDerivedMetrics {
  const vacancyLoss = input.projectedMonthlyRent * (input.vacancyRate / 100);
  const effectiveGrossIncome = input.projectedMonthlyRent - vacancyLoss;
  const propertyManagementFeeValue =
    effectiveGrossIncome * (input.propertyManagementFeePercent / 100);
  const totalOperatingExpenses =
    input.maintenanceReserves + propertyManagementFeeValue;
  const netOperatingIncome = effectiveGrossIncome - totalOperatingExpenses;
  const netCashFlow = netOperatingIncome - input.longTermMortgagePayment;

  const annualNOI = netOperatingIncome * 12;
  const capRate = totalAllInCost > 0 ? (annualNOI / totalAllInCost) * 100 : 0;

  const totalCashInvested =
    input.financingCashInvested > 0
      ? input.financingCashInvested
      : totalAllInCost;
  const annualCashFlow = netCashFlow * 12;
  const cashOnCashReturn =
    totalCashInvested > 0 ? (annualCashFlow / totalCashInvested) * 100 : 0;

  return {
    vacancyLoss,
    effectiveGrossIncome,
    propertyManagementFeeValue,
    totalOperatingExpenses,
    netOperatingIncome,
    netCashFlow,
    annualNOI,
    capRate,
    cashOnCashReturn,
  };
}
