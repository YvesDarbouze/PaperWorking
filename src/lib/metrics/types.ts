/**
 * Structured metric result types for the REI Metrics Engine.
 *
 * These types wrap the raw numerical outputs of reiMetrics.ts with
 * state tracking, input provenance, and missing-field diagnostics.
 *
 * Pure types — no runtime code, no I/O imports.
 */

/**
 * Lifecycle state of a computed metric.
 *
 * - projected:  Based on user assumptions (Phase 1 — Find & Fund)
 * - actual:     Computed from confirmed deal terms (Phase 2 — Acquisition complete)
 * - live:       Computed from real-time operational data (Phase 3 — Hold)
 * - realized:   Computed from final exit numbers (Phase 4 — Exit)
 * - incomplete: One or more required inputs missing — value is null
 * - n/a:        Metric does not apply to this deal type (e.g. DSCR on all-cash)
 */
export type MetricState = 'projected' | 'actual' | 'live' | 'realized' | 'incomplete' | 'n/a';

/**
 * Canonical wrapper for every metric computation.
 */
export interface MetricResult {
  /** The computed metric value, or null if incomplete/n/a */
  value: number | null;
  /** The state of this metric based on input data quality */
  state: MetricState;
  /** Map of field paths to the values used in computation */
  inputsUsed: Record<string, number | string>;
  /** List of field paths that were missing, preventing full computation */
  inputsMissing: string[];
  /** Optional project IDs included in the rollup calculation */
  projectsIncluded?: string[];
  /** Optional project IDs excluded from the rollup calculation */
  projectsExcluded?: string[];
}

/**
 * All canonical and supplemental REI datapoints exposed by PaperWorking.
 */
export type MetricId =
  // Hero 10
  | 'NOI'
  | 'CASH_FLOW'
  | 'CAP_RATE'
  | 'COC'
  | 'GRM'
  | 'DSCR'
  | 'IRR'
  | 'OCCUPANCY'
  | 'OER'
  | 'APPRECIATION'
  // Supplemental 11
  | 'LTV'
  | 'DEBT_YIELD'
  | 'EQUITY_MULTIPLE'
  | 'BREAK_EVEN_OCCUPANCY'
  | 'CAPITAL_RESERVES'
  | 'PAYBACK_PERIOD'
  | 'TENANT_TURNOVER'
  | 'LEASE_RENEWAL'
  | 'MAINTENANCE_COST_PER_UNIT'
  | 'DOM'
  | 'BUDGET_VARIANCE';
