export { deriveAllProjectMetrics, calculateManagementFee } from './deriveAllProjectMetrics.js';
export {
  computeAmortizationSchedule,
  computeMonthlyPayment,
  computeAnnualDebtConstant,
} from './amortization-engine.js';
export { computeFundPhaseMetrics, computeIRR, computeIRRWithDetails } from './fund-phase-engine.js';
export {
  computeExitCapSensitivity,
  computeRentGrowthSensitivity,
  computeVacancyStressTest,
  computeHoldPeriodSensitivity,
  buildComprehensiveSensitivityResults,
} from './sensitivity-engine.js';
export {
  computeSensitivityGrids,
  SENSITIVITY_RENT_STEPS_PCT,
  SENSITIVITY_EXIT_STEPS_PCT,
  SENSITIVITY_RATE_STEPS_BPS,
} from './sensitivity-matrix-engine.js';
export type {
  SensitivityRentStep,
  SensitivityExitStep,
  SensitivityRateStep,
} from './sensitivity-matrix-engine.js';
export { computeDistributionWaterfall } from './waterfall-engine.js';
export type {
  WaterfallInputs,
  WaterfallResult,
  WaterfallDistributionDetail,
  WaterfallTierSummary,
} from './waterfall-engine.js';
export { canonicalSeedDeal, expectedGoldenValues } from './fixtures/canonical-seed-deal.js';
export type {
  MetricValue,
  ProjectMetricsResult,
  MetricResult,
  MetricState,
  MetricId,
  SensitivityResults,
  ExitCapSensitivityPoint,
  RentGrowthSensitivityPoint,
  VacancyStressPoint,
  HoldPeriodSensitivityPoint,
} from './types.js';
export type {
  AmortizationPayment,
  AmortizationSchedule,
  AmortizationOptions,
} from './amortization-engine.js';
export type {
  EquityInvestor,
  WaterfallTier,
  CashFlowEvent,
  FundPhaseResult,
  DatedIrrRoot,
  DatedIrrStatus,
  DatedIrrResult,
} from './fund-phase-engine.js';
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
export {
  ValuationInputRequiredError,
  TerminalValueMethodRequiredError,
  computeMAO,
  reconcileAcquisitionUnderwriting,
  transformCalculatorToProject,
  generateUnderContractTasks,
} from './acquisition-engine.js';
export type {
  MaoResult,
  UnderwritingCalculatorInputs,
  ReconciledUnderwritingMetrics,
  TransformCalculatorInput,
  TransformedProjectPayload,
  GeneratedAcquisitionTask,
  TaskGenerationConfig,
} from './acquisition-engine.js';
export {
  computeProjectedIrr,
  calculateProjectedIrrDetails,
} from './projected-irr.js';
export type {
  ProjectedIrrAssumptions,
  ProjectedIrrParams,
  ProjectedIrrBreakdown,
  IrrRoot,
  IrrStatus,
} from './projected-irr.js';
export { canonicalDemoDeal } from './fixtures/canonical-demo-deal.js';
export type { CanonicalDemoDeal } from './fixtures/canonical-demo-deal.js';
export {
  ENGINE_VERSION,
  NEXT_ENGINE_VERSION,
  ENGINE_V4_ENABLED,
} from './constants.js';

export {
  deriveIanaTimezoneFromAddress,
  computeContractualDeadline,
  addBusinessDaysToLocalDate,
  addCalendarDaysToLocalDate,
  getLocalDateParts,
  createUtcInstantFromLocalWallClock,
  isWeekend,
} from './deadline-engine.js';

export type {
  DeadlineCalculationType,
  ContractualDeadlineInput,
  LocalContractRepresentation,
  ContractualDeadlineResult,
} from './deadline-engine.js';


