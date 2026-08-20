export { deriveAllProjectMetrics, calculateManagementFee } from './deriveAllProjectMetrics.js';
export { computeAmortizationSchedule, computeMonthlyPayment } from './amortization-engine.js';
export { computeFundPhaseMetrics, computeIRR } from './fund-phase-engine.js';
export { canonicalSeedDeal, expectedGoldenValues } from './fixtures/canonical-seed-deal.js';
export type {
  MetricValue,
  ProjectMetricsResult,
  MetricResult,
  MetricState,
  MetricId,
} from './types.js';
export type {
  AmortizationPayment,
  AmortizationSchedule,
} from './amortization-engine.js';
export type {
  EquityInvestor,
  WaterfallTier,
  CashFlowEvent,
  FundPhaseResult,
} from './fund-phase-engine.js';
