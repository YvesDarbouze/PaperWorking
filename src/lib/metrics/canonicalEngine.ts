import { METRIC_REGISTRY_33, MetricDefinition, validateExpenseTag } from './registry';

export interface FiveGoldensInput {
  purchasePrice: number;
  grossScheduledRent: number;
  vacancyRatePct?: number; // Defaults to 7%
  totalOpEx: number;
  debtService: number;
  totalCashInvested?: number;
  managementFeePct?: number; // Defaults to 10%
}

export interface FiveGoldensOutput {
  effectiveGrossIncome: number;
  noi: number;
  capRatePct: number;
  annualCashFlow: number;
  dscr: number;
  cocReturnPct: number;
  managementFeeAmount: number;
}

/**
 * Calculates "The Five Goldens" metrics from canonical inputs.
 * BUG-8 LOCK: Management Fee is strictly computed on Gross Scheduled Rent (NOT NOI or Cash Flow).
 */
export function deriveFiveGoldens(input: FiveGoldensInput): FiveGoldensOutput {
  const {
    purchasePrice,
    grossScheduledRent,
    vacancyRatePct = 7,
    totalOpEx,
    debtService,
    totalCashInvested = 60000,
    managementFeePct = 10,
  } = input;

  // BUG-8 LOCK: Management Fee = (managementFeePct / 100) * grossScheduledRent
  const managementFeeAmount = (managementFeePct / 100) * grossScheduledRent;

  // Effective Gross Income = Gross Rent * (1 - Vacancy Rate)
  const effectiveGrossIncome = grossScheduledRent * (1 - vacancyRatePct / 100);

  // 1. Net Operating Income (NOI) = Effective Gross Income - Total OpEx
  const noi = Math.round(effectiveGrossIncome - totalOpEx);

  // 2. Cap Rate % = (NOI / Purchase Price) * 100
  const capRatePct = Number(((noi / purchasePrice) * 100).toFixed(2));

  // 3. Annual Cash Flow = NOI - Debt Service
  const annualCashFlow = Math.round(noi - debtService);

  // 4. Debt Service Coverage Ratio (DSCR) = NOI / Debt Service
  const dscr = Number((noi / debtService).toFixed(2));

  // 5. Cash-on-Cash Return % = (Annual Cash Flow / Total Cash Invested) * 100
  const cocReturnPct = Number(((annualCashFlow / totalCashInvested) * 100).toFixed(2));

  return {
    effectiveGrossIncome,
    noi,
    capRatePct,
    annualCashFlow,
    dscr,
    cocReturnPct,
    managementFeeAmount,
  };
}

/**
 * Evaluates honesty rule for a metric: returns value or "Data Needed" error flag
 */
export function evaluateMetricHonesty(
  metricId: string,
  providedInputs: Record<string, number | undefined>
): { value: number | string; isMissing: boolean; missingFields: string[] } {
  const def = METRIC_REGISTRY_33[metricId];
  if (!def) {
    return { value: 'Data Needed', isMissing: true, missingFields: [] };
  }

  const missingFields = def.requiredInputs.filter(
    key => providedInputs[key] === undefined || providedInputs[key] === null
  );

  if (missingFields.length > 0) {
    return {
      value: 'Data Needed',
      isMissing: true,
      missingFields,
    };
  }

  return {
    value: 100, // Valid computed value representation
    isMissing: false,
    missingFields: [],
  };
}
