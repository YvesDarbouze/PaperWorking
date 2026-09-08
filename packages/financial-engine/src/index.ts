export { deriveAllProjectMetrics, calculateManagementFee } from './deriveAllProjectMetrics.js';
export { computeAmortizationSchedule, computeMonthlyPayment } from './amortization-engine.js';
export { computeFundPhaseMetrics, computeIRR } from './fund-phase-engine.js';
export {
  computeExitCapSensitivity,
  computeRentGrowthSensitivity,
  computeVacancyStressTest,
  computeHoldPeriodSensitivity,
  buildComprehensiveSensitivityResults,
} from './sensitivity-engine.js';
export { computeDistributionWaterfall } from './waterfall-engine.js';
export type {
  WaterfallInputs,
  WaterfallResult,
  WaterfallDistributionDetail,
  WaterfallTierSummary,
} from './waterfall-engine.js';
export {
  computeAssetDepreciationSchedule,
  computeMidMonthInServiceFraction,
  computeMultiAssetDepreciationSchedule,
  getDefaultRecoveryPeriodYears,
  resolveImprovementBasis,
} from './depreciation-engine.js';
export type {
  AssetDepreciationSchedule,
  AssetYearDepreciation,
  DepreciableAsset,
  DepreciationCalculationResult,
  MultiAssetDepreciationSummary,
  PropertyRecoveryClass,
} from './depreciation-engine.js';
export {
  aggregateStatementMatrices,
  buildStatementColumns,
  deriveProjectStatementMatrix,
} from './statement-engine.js';
export type {
  FinancialStatementMatrix,
  ProjectStatementInputs,
  StatementColumn,
  StatementGranularity,
  StatementRow,
  StatementType,
} from './statement-engine.js';
export {
  parseStoredCashFlowEvents,
  serializeCashFlowEventsForPersistence,
  sortCashFlowEventsByDate,
  storedEventsToEngineEvents,
  validateCashFlowEvent,
  validateCashFlowEventSchedule,
  computeEquityMultipleFromEngineEvents,
  cashFlowScheduleHasMixedSigns,
  type StoredCashFlowEvent,
  type EngineCashFlowEvent,
  type CashFlowEventValidationError,
} from './cash-flow-schedule.js';
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
