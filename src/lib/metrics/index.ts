/**
 * REI Metrics — unified facade barrel export
 *
 * Re-exports everything from:
 *  - reiMetrics.ts       (new pure formula functions + DerivedMetrics types)
 *  - dealMetrics.ts      (computeFlipMetrics, computeHoldMetrics, dealHealthColor)
 *  - calculatorUtils.ts  (computeAutopsyMetrics, calculateSeventyPercentRule, etc.)
 *  - deriveAllProjectMetrics.ts (Agent 4 SOLE 33-Metric Engine)
 *
 * Import from '@/lib/metrics' to access all calculation functions and types.
 */

// ── Core engine (backward-compatible) ─────────────────────────────────────────
export * from './reiMetrics';
export * from '@/lib/financials/dealMetrics';
export * from '@/lib/math/calculatorUtils';

// ── Agent 4 Single Source of Truth Override ───────────────────────────────────
export { deriveAllProjectMetrics } from './deriveAllProjectMetrics';
export { computeAmortizationSchedule, computeMonthlyPayment } from './amortization-engine';
export { computeFundPhaseMetrics, computeIRR } from './fund-phase-engine';
export * from './fixtures/canonical-seed-deal';

// ── Structured metric types ───────────────────────────────────────────────────
export type { MetricResult, MetricState, MetricId, MetricValue, ProjectMetricsResult } from './types';

// ── Structured metric wrappers ────────────────────────────────────────────────
export { computeNOIMetric } from './computeNOI';
export { computeCashFlowMetric } from './computeCashFlow';
export { computeCapRateMetric } from './computeCapRate';
export { computeCoCMetric } from './computeCoC';
export { computeGRMMetric } from './computeGRM';
export { computeDSCRMetric } from './computeDSCR';
export { computeIRRMetric } from './computeIRR';
export { computeOccupancyMetric } from './computeOccupancy';
export { computeExpenseRatioMetric } from './computeExpenseRatio';
export { computeAppreciationMetric } from './computeAppreciation';

// ── Supplemental metric wrappers ──────────────────────────────────────────────
export {
  computeLTVMetric,
  computeDebtYieldMetric,
  computeEquityMultipleMetric,
  computeBreakEvenOccupancyMetric,
  computeCapitalReservesMetric,
  computePaybackPeriodMetric,
  computeTenantTurnoverMetric,
  computeLeaseRenewalMetric,
  computeMaintenanceCostPerUnitMetric,
  computeDOMMetric,
  computeBudgetVarianceMetric,
} from './computeSupplemental';

// ── Change detection ──────────────────────────────────────────────────────────
export { whatChanged, METRIC_DEPENDENCIES } from './whatChanged';

// ── Taxonomy & classification ─────────────────────────────────────────────────
export {
  HERO_ORDER,
  CATEGORY_ORDER,
  METRIC_TAXONOMY,
  getHeroMetrics,
  getSupplementalByCategory,
  getMetricEntry,
} from './metricTaxonomy';
export type { MetricCategory, MetricTier, MetricTaxonomyEntry } from './metricTaxonomy';

// ── Demo projects data ────────────────────────────────────────────────────────
export { DEMO_PROJECTS } from './demoProjects';

// ── Metric Registry & Canonical Engine ─────────────────────────────────────────
export * from './metricRegistry';
export * from './registry';
export * from './canonicalEngine';
