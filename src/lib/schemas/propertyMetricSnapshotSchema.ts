/**
 * ═══════════════════════════════════════════════════════════════
 * PaperWorking — Property Metric Snapshot Schema (Zod)
 *
 * Canonical Zod schema for the Firestore
 * `/propertyMetricSnapshots/{snapshotId}` collection.
 *
 * These documents are time-series snapshots of the 10 core REI
 * metrics, computed by the metrics engine and persisted for
 * historical tracking and portfolio-level aggregation.
 *
 * Mirrors: src/types/schema.ts (PropertyMetricSnapshot)
 *          src/lib/metrics/snapshotService.ts
 *
 * @architect  Schema owner
 * ═══════════════════════════════════════════════════════════════
 */

import { z } from 'zod';

/** Period granularity */
export const periodTypeEnum = z.enum(['monthly', 'quarterly', 'annual']);

/**
 * Firestore `/propertyMetricSnapshots/{snapshotId}` document schema.
 *
 * ID format: `${projectId}_${period}` (e.g. "abc123_2026-05")
 *
 * All metric fields are nullable — null means "insufficient inputs
 * to compute this metric for the given period."
 *
 * PERCENTAGE FORMAT:
 * - capRate, arvCapRate, cashOnCashReturn, oer, ltv → whole number (8.5 = 8.5%)
 * - occupancyRate → whole number (95 = 95%)
 * - irr → whole number (15.2 = 15.2%)
 * - ownershipPercentage → 0-100
 */
export const propertyMetricSnapshotSchema = z.object({
  /** Composite ID: `${projectId}_${period}` */
  id: z.string().min(1),

  /** Parent project ID */
  projectId: z.string().min(1),

  /** Organization ID for multi-tenant isolation */
  organizationId: z.string().min(1),

  /**
   * Period key — format depends on periodType:
   * - monthly:   "YYYY-MM"   (e.g. "2026-05")
   * - quarterly: "YYYY-QX"   (e.g. "2026-Q2")
   * - annual:    "YYYY"      (e.g. "2026")
   */
  period: z.string().min(4),

  /** Granularity of this snapshot */
  periodType: periodTypeEnum,

  /** First day of the period, saved as Timestamp/Date */
  date: z.any(),

  // ── 10 Core Financial Metrics + IRR ──

  /**
   * Net Operating Income in USD dollars (annual).
   * D1 metric. Null if no rental income inputs.
   */
  noi: z.number().nullable(),

  /**
   * Annual cash flow in USD dollars.
   * D2 metric = NOI - annual debt service.
   */
  annualCashFlow: z.number().nullable(),

  /**
   * Monthly cash flow in USD dollars.
   * D2 metric / 12.
   */
  monthlyCashFlow: z.number().nullable(),

  /**
   * Cap rate as whole number percentage (e.g. 8.5 for 8.5%).
   * D3 metric = NOI / property value × 100.
   */
  capRate: z.number().nullable(),

  /**
   * ARV-based cap rate as whole number percentage.
   * D3b metric = NOI / ARV × 100.
   */
  arvCapRate: z.number().nullable(),

  /**
   * Cash-on-Cash return as whole number percentage.
   * D4 metric = annual cash flow / total cash invested × 100.
   */
  cashOnCashReturn: z.number().nullable(),

  /**
   * Gross Rent Multiplier (dimensionless ratio).
   * D5 metric = property value / annual gross rent.
   */
  grossRentMultiplier: z.number().nullable(),

  /**
   * Debt Service Coverage Ratio (dimensionless ratio).
   * D6 metric = NOI / annual debt service.
   * ≥ 1.25 is typically healthy.
   */
  dscr: z.number().nullable(),

  /**
   * Loan-to-Value as whole number percentage.
   * D8 metric = loan amount / property value × 100.
   */
  ltv: z.number().nullable(),

  /**
   * Operating Expense Ratio as whole number percentage.
   * D9 metric = operating expenses / gross income × 100.
   */
  oer: z.number().nullable(),

  /**
   * Occupancy rate as whole number percentage (e.g. 95 for 95%).
   * D10 metric = occupied units / total units × 100.
   * Defaults to 100 for single-family.
   */
  occupancyRate: z.number().nullable(),

  /**
   * Internal Rate of Return as whole number percentage.
   * Computed via Newton-Raphson NPV iteration.
   */
  irr: z.number().nullable(),

  /**
   * Annualized appreciation as whole number percentage.
   */
  appreciation: z.number().nullable(),

  /** Whether appreciation reflects a realized sale vs. estimate */
  isAppreciationRealized: z.boolean().nullable(),

  // ── Raw Component Fields (for portfolio weighting) ──

  /** Property value in USD dollars — used as denominator for multiple ratios */
  propertyValue: z.number().nullable(),

  /** Total cash invested by the operator in USD dollars */
  totalCashInvested: z.number().nullable(),

  /** Gross annual rental income in USD dollars */
  grossRentalIncome: z.number().nullable(),

  /** Annual debt service in USD dollars */
  annualDebtService: z.number().nullable(),

  /** Outstanding loan balance in USD dollars */
  loanAmount: z.number().nullable(),

  /** Total operating expenses in USD dollars */
  totalOperatingExpenses: z.number().nullable(),

  /** Gross operating income in USD dollars */
  grossOperatingIncome: z.number().nullable(),

  /** Number of currently occupied units */
  occupiedUnits: z.number().nullable(),

  /** Total number of leasable units */
  numberOfUnits: z.number().nullable(),

  // ── R0 — Investor-Scope Fields ──

  /**
   * Ownership percentage as whole number (0-100).
   * Used to scale asset-level metrics to the investor's share.
   */
  ownershipPercentage: z.number().nullable(),

  /** Investor's pro-rata NOI in USD dollars */
  investorNOI: z.number().nullable(),

  /** Investor's pro-rata cash flow in USD dollars */
  investorCashFlow: z.number().nullable(),

  /**
   * Investor's cash-on-cash return as whole number percentage.
   * = investorCashFlow / ownerCashInvested × 100.
   */
  investorCoCReturn: z.number().nullable(),

  // ── Timestamps ──

  /** When this snapshot was computed and persisted */
  createdAt: z.any(),
});

/** Inferred TypeScript type from the Zod schema */
export type PropertyMetricSnapshot = z.infer<typeof propertyMetricSnapshotSchema>;
