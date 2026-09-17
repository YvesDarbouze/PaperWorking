import { computeMonthlyPayment, computeAmortizationSchedule } from './amortization-engine.js';
import { computeProjectedIrr, calculateProjectedIrrDetails, type IrrStatus, type IrrRoot } from './projected-irr.js';
import { ENGINE_VERSION } from './constants.js';
import { deriveIanaTimezoneFromAddress } from './deadline-engine.js';
import { computeSensitivityGrids } from './sensitivity-matrix-engine.js';

export class ValuationInputRequiredError extends Error {
  readonly code = 'VALUATION_INPUT_REQUIRED';
  constructor(message = 'ARV not provided — enter ARV to compute equity/MAO.') {
    super(message);
    this.name = 'ValuationInputRequiredError';
  }
}

export class TerminalValueMethodRequiredError extends Error {
  readonly code = 'TERMINAL_VALUE_METHOD_REQUIRED';
  constructor(
    message = 'Terminal value method not selected — choose appreciation_pct, exit_cap, or per_unit.',
  ) {
    super(message);
    this.name = 'TerminalValueMethodRequiredError';
  }
}

// ── 1. Maximum Allowable Offer (MAO / 70% Rule) ────────────────────────────────

export interface MaoResult {
  mao: number;
  maxAllowablePurchasePrice: number;
  rawMao: number;
  ruleMultiplier: number;
  isViable: boolean;
  formulaDescription: string;
}

/**
 * Computes Maximum Allowable Offer (MAO) according to the institutional 70% rule
 * (or user-configured threshold).
 *
 * Formula: MAO = (ARV × ruleMultiplier) - rehabBudget - buyerClosingCosts
 */
export function computeMAO(
  estimatedARV: number | null | undefined,
  rehabBudget: number,
  ruleMultiplier: number = 0.70,
  buyerClosingCosts: number = 0,
): MaoResult {
  if (
    estimatedARV === null ||
    estimatedARV === undefined ||
    isNaN(Number(estimatedARV)) ||
    Number(estimatedARV) <= 0
  ) {
    throw new ValuationInputRequiredError(
      'ARV not provided — enter ARV to compute equity/MAO.'
    );
  }
  const arv = Number(estimatedARV);
  const rehab = Math.max(0, rehabBudget);
  const closingCosts = Math.max(0, buyerClosingCosts);
  const multiplier = Math.max(0, Math.min(1, ruleMultiplier));

  const rawMao = Math.round(arv * multiplier - rehab - closingCosts);
  const isViable = rawMao > 0;
  const mao = Math.max(0, rawMao);

  const formulaParts = [
    `(${arv.toLocaleString()} × ${(multiplier * 100).toFixed(0)}%)`,
    rehab.toLocaleString(),
  ];
  if (closingCosts > 0) {
    formulaParts.push(closingCosts.toLocaleString());
  }

  return {
    mao,
    maxAllowablePurchasePrice: mao,
    rawMao,
    ruleMultiplier: multiplier,
    isViable,
    formulaDescription: `${formulaParts[0]} - ${formulaParts[1]}${closingCosts > 0 ? ` - ${formulaParts[2]}` : ''}`,
  };
}

// ── 2. Underwriting Metrics Reconciliation ────────────────────────────────────

export interface UnderwritingCalculatorInputs {
  purchasePrice: number;
  rehabBudget?: number;
  estimatedARV?: number | null;
  grossRentMonthly?: number;
  grossMonthlyRent?: number;
  otherIncomeMonthly?: number;
  otherMonthlyIncome?: number;
  operatingExpensesAnnual?: number; // Optional itemized annual OpEx override
  operatingExpenseRatioPct?: number; // Default 35%
  vacancyRatePct?: number; // Default 5%
  targetLtvPct?: number; // Default 75%
  interestRatePct?: number; // Default 6.5%
  amortizationYears?: number; // Default 30
  interestOnlyMonths?: number; // Default 0
  buyerClosingCostsPct?: number; // Default 2.0%
  holdPeriodYears?: number; // Default 5
  annualAppreciationPct?: number; // Default 3.0%
  /** W2-09: Alias for annualAppreciationPct */
  appreciationPct?: number;
  /** W2-09: Annual rent growth %/yr (default 0.0) */
  rentGrowthPct?: number;
  /** W2-09: Annual expense growth %/yr (default 0.0) */
  expenseGrowthPct?: number;
  /** W2-10: Debt structure type — amortizing | interest_only | arm (default amortizing) */
  loanType?: 'amortizing' | 'interest_only' | 'arm';
  /** W2-10: Interest-only duration in years (default 5) */
  ioPeriodYears?: number;
  /** W2-10: Fixed period in years for ARM loans (default 5) */
  armFixedPeriodYears?: number;
  /** W2-10: Assumed rate adjustment % for ARM loans (default 2.0) */
  armAdjustmentPct?: number;
  /** W2-11: Lease-up and stabilization duration in months (0 = stabilized, default 0) */
  stabilizationMonths?: number;
  /** W2-11: Initial months completely vacant immediately after closing (default 0) */
  monthsVacantAtClose?: number;
  /** W2-11: Concessions in months of free rent granted during lease-up (default 0) */
  concessionsMonths?: number;
  /** W2-11: Rent ramp % during active lease-up months (default 100) */
  leaseUpRentRampPct?: number;
  sellingCostsPct?: number; // Default 6.0%
  exitCapRatePct?: number; // Default 6.5%
  costOfSalePct?: number; // Default 5.0%
  strategy?: 'flip' | 'brrrr' | 'buy_and_hold_rental' | 'short_term_rental_airbnb' | 'commercial_value_add' | 'wholesale';
  /** W2-06: Explicit terminal value method — appreciation_pct | exit_cap | per_unit */
  terminalValueMethod?: 'appreciation_pct' | 'exit_cap' | 'per_unit';
  /** W2-14: Appreciation calculation base ('purchase_price' | 'arv', default 'purchase_price') */
  appreciationBase?: 'purchase_price' | 'arv';
  /** W2-06: Units count when per_unit method is chosen */
  unitsCount?: number;
  /** W2-06: Exit valuation per unit when per_unit method is chosen */
  perUnitExitValue?: number;
  /** W2-06: Allow fallback to labeled default (source: 'default') for migrating existing deals */
  allowDefaultTerminalMethod?: boolean;
  /** W2-12: Whether to compute 2D sensitivity grids (default true, set false in internal loops) */
  computeSensitivityGrids?: boolean;
}

export interface ReconciledUnderwritingMetrics {
  totalCostBasis: number;
  loanAmount: number;
  cashRequired: number;
  buyerClosingCostsAmount: number;
  grossOperatingIncome: number;
  totalOperatingExpenses: number;
  netOperatingIncome: number;
  monthlyDebtService: number;
  annualDebtService: number;
  annualNetCashFlow: number;
  monthlyNetCashFlow: number;
  capRateOnCost: number;
  cashOnCashReturnPct: number;
  projectedIrrPct: number | null;
  /** W2-05: Solver status — 'converged' | 'no_sign_change' | 'multiple_roots' | 'non_convergent' */
  irrStatus: import('./projected-irr.js').IrrStatus;
  /** W2-05: All discovered IRR roots with residuals */
  irrRoots: import('./projected-irr.js').IrrRoot[];
  /** W2-05: Exact cash-flow vector solved on */
  irrCashFlowVector: number[];
  /** W2-06: Explicit terminal value method applied */
  terminalValueMethod: 'appreciation_pct' | 'exit_cap' | 'per_unit';
  /** W2-06: Human-readable terminal value method qualifier */
  terminalValueLabel: string;
  /** W2-06: Calculated terminal exit valuation */
  estimatedExitValue: number;
  projectedFlipProfit: number;
  dscr: number | null;
  ltvPct: number;
  grossRentMultiplier: number | null;
  maximumAllowableOffer70Pct: number;
  /** W2-08: Annual debt service / loan amount × 100 */
  loanConstantPct: number;
  /** W2-08: Yield on cost (same as capRateOnCost) */
  yieldOnCostPct: number;
  /** W2-08: true when yieldOnCostPct < loanConstantPct OR cashOnCashReturnPct < 0 */
  isNegativeLeverage: boolean;
  /** W2-09: Annual rent growth % applied */
  rentGrowthPct?: number;
  /** W2-09: Annual expense growth % applied */
  expenseGrowthPct?: number;
  /** W2-09: Annual appreciation rate applied */
  annualAppreciationPct?: number;
  /** W2-09: Multi-year projection schedule */
  annualProjections?: import('./projected-irr.js').AnnualProjectionItem[];
  /** W2-10: Debt structure type applied */
  loanType?: 'amortizing' | 'interest_only' | 'arm';
  /** W2-10: IO duration in years */
  ioPeriodYears?: number;
  /** W2-10: ARM fixed period */
  armFixedPeriodYears?: number;
  /** W2-10: ARM adjustment % */
  armAdjustmentPct?: number;
  /** W2-10: Payment shock disclosure */
  paymentShock?: {
    year: number;
    previousMonthlyPayment: number;
    newMonthlyPayment: number;
    monthlyIncreaseAmount: number;
    percentageIncrease: number;
    disclosureLabel: string;
  } | null;
  /** W2-11: Lease-up and stabilization duration in months */
  stabilizationMonths?: number;
  /** W2-11: Initial months completely vacant immediately after closing */
  monthsVacantAtClose?: number;
  /** W2-11: Concessions in months of free rent granted */
  concessionsMonths?: number;
  /** W2-11: Rent ramp % during active lease-up months */
  leaseUpRentRampPct?: number;
  /** W2-11: True if asset has an active lease-up period in Year 1 */
  isLeaseUpActive?: boolean;
  /** W2-11: Stabilized run-rate gross operating income */
  stabilizedGrossOperatingIncome?: number;
  /** W2-11: Stabilized run-rate net operating income */
  stabilizedNetOperatingIncome?: number;
  /** W2-11: Stabilized run-rate annual net cash flow */
  stabilizedAnnualCashFlow?: number;
  /** W2-12: Server-computed 2D sensitivity grids (Rent vs Exit Valuation & Rent vs Rate) */
  sensitivityGrids?: import('@paperworking/validation').SensitivityGridsResult;
  /** W2-14: Appreciation calculation base ('purchase_price' | 'arv') */
  appreciationBase?: 'purchase_price' | 'arv';
  calculatedAt: string;
  engineVersion: string;
}

/**
 * Reconciles and computes all acquisition underwriting metrics using canonical formulas.
 */
export function reconcileAcquisitionUnderwriting(
  inputs: UnderwritingCalculatorInputs,
): ReconciledUnderwritingMetrics {
  const purchasePrice = Math.max(0, inputs.purchasePrice);
  const rehabBudget = Math.max(0, inputs.rehabBudget ?? 0);

  if (
    inputs.estimatedARV === null ||
    inputs.estimatedARV === undefined ||
    isNaN(Number(inputs.estimatedARV)) ||
    Number(inputs.estimatedARV) <= 0
  ) {
    throw new ValuationInputRequiredError(
      'ARV not provided — enter ARV to compute equity/MAO.'
    );
  }
  const estimatedARV = Number(inputs.estimatedARV);
  const buyerClosingCostsPct = inputs.buyerClosingCostsPct ?? 2.0;
  const buyerClosingCostsAmount = Math.round(purchasePrice * (buyerClosingCostsPct / 100));
  const totalCostBasis = purchasePrice + buyerClosingCostsAmount + rehabBudget;

  const targetLtvPct = Math.max(0, Math.min(100, inputs.targetLtvPct ?? 75.0));
  const loanAmount = Math.round(purchasePrice * (targetLtvPct / 100));
  const cashRequired = Math.max(0, totalCostBasis - loanAmount);

  // Income and Operations
  const grossRentMonthly = Math.max(0, inputs.grossRentMonthly ?? inputs.grossMonthlyRent ?? 0);
  const otherIncomeMonthly = Math.max(0, inputs.otherIncomeMonthly ?? inputs.otherMonthlyIncome ?? 0);
  const grossAnnualRent = grossRentMonthly * 12;
  const otherAnnualIncome = otherIncomeMonthly * 12;
  const vacancyRatePct = Math.max(0, Math.min(100, inputs.vacancyRatePct ?? 5.0));
  const operatingExpenseRatioPct = Math.max(0, Math.min(100, inputs.operatingExpenseRatioPct ?? 35.0));

  const stabilizationMonths = Math.max(0, inputs.stabilizationMonths ?? 0);
  const monthsVacantAtClose = Math.max(0, inputs.monthsVacantAtClose ?? 0);
  const concessionsMonths = Math.max(0, inputs.concessionsMonths ?? 0);
  const leaseUpRentRampPct = Math.max(0, Math.min(100, inputs.leaseUpRentRampPct ?? 100.0));
  const isLeaseUpActive = stabilizationMonths > 0;

  const stabilizedGrossOperatingIncome = Math.round(
    grossAnnualRent * (1 - vacancyRatePct / 100) + otherAnnualIncome,
  );
  const totalOperatingExpenses =
    inputs.operatingExpensesAnnual !== undefined
      ? Math.round(inputs.operatingExpensesAnnual)
      : Math.round(grossAnnualRent * (operatingExpenseRatioPct / 100));
  const stabilizedNetOperatingIncome = stabilizedGrossOperatingIncome - totalOperatingExpenses;

  let grossOperatingIncome = stabilizedGrossOperatingIncome;
  let netOperatingIncome = stabilizedNetOperatingIncome;

  if (isLeaseUpActive) {
    const mStab = Math.min(12, stabilizationMonths);
    const mVac = Math.min(mStab, monthsVacantAtClose);
    const mActive = mStab - mVac;
    const activeRent = mActive * grossRentMonthly * (leaseUpRentRampPct / 100);
    const concessionDeduction = concessionsMonths * grossRentMonthly;
    const leaseUpCollectedRent = Math.max(0, activeRent - concessionDeduction);

    // Vacancy assumption applies ONLY post-stabilization
    const mPost = 12 - mStab;
    const postScheduledRent = mPost * grossRentMonthly;
    const postVacancyLoss = postScheduledRent * (vacancyRatePct / 100);
    const postCollectedRent = postScheduledRent - postVacancyLoss;
    const effectiveYear1Rent = leaseUpCollectedRent + postCollectedRent;

    grossOperatingIncome = Math.round(effectiveYear1Rent + otherAnnualIncome);
    netOperatingIncome = Math.round(grossOperatingIncome - totalOperatingExpenses);
  }

  // Financing & Debt Service
  const loanType: 'amortizing' | 'interest_only' | 'arm' = inputs.loanType ?? 'amortizing';
  const ioPeriodYears = inputs.ioPeriodYears ?? (inputs.interestOnlyMonths ? Math.round(inputs.interestOnlyMonths / 12) : 5);
  const armFixedPeriodYears = inputs.armFixedPeriodYears ?? 5;
  const armAdjustmentPct = inputs.armAdjustmentPct ?? 2.0;

  const interestRatePct = inputs.interestRatePct ?? 6.5;
  const amortizationYears = inputs.amortizationYears ?? 30;
  const monthlyRate = interestRatePct / 100;

  let monthlyDebtService = 0;
  if (loanType === 'interest_only') {
    // Interest-Only: principal * (annualRate / 12)
    // Golden check: $390,000 * 0.065 / 12 = $2,112.50
    monthlyDebtService = Number(((loanAmount * (interestRatePct / 100)) / 12).toFixed(2));
  } else {
    monthlyDebtService = computeMonthlyPayment(loanAmount, monthlyRate, amortizationYears);
  }
  const annualDebtService = Math.round(monthlyDebtService * 12);
  const annualNetCashFlow = netOperatingIncome - annualDebtService;
  const monthlyNetCashFlow = Math.round(annualNetCashFlow / 12);
  const stabilizedAnnualCashFlow = stabilizedNetOperatingIncome - annualDebtService;

  // Payment Shock Calculation (W2-10)
  let paymentShock: ReconciledUnderwritingMetrics['paymentShock'] = null;
  if (loanType === 'interest_only' && loanAmount > 0) {
    const transitionYear = ioPeriodYears + 1;
    const remainingYears = Math.max(1, amortizationYears - ioPeriodYears);
    const reamortPayment = computeMonthlyPayment(loanAmount, monthlyRate, remainingYears);
    const previousPayment = monthlyDebtService;
    const newPayment = reamortPayment;
    const increaseAmount = Number((newPayment - previousPayment).toFixed(2));
    const percentageIncrease = previousPayment > 0 ? Number(((increaseAmount / previousPayment) * 100).toFixed(1)) : 0;
    const disclosureLabel = `Payment rises to $${Math.round(newPayment).toLocaleString()} in year ${transitionYear} (+$${Math.round(increaseAmount).toLocaleString()}/mo)`;

    paymentShock = {
      year: transitionYear,
      previousMonthlyPayment: previousPayment,
      newMonthlyPayment: newPayment,
      monthlyIncreaseAmount: increaseAmount,
      percentageIncrease,
      disclosureLabel,
    };
  } else if (loanType === 'arm' && loanAmount > 0) {
    const resetYear = armFixedPeriodYears + 1;
    const remainingYears = Math.max(1, amortizationYears - armFixedPeriodYears);
    const fixedMonth = armFixedPeriodYears * 12;
    const amort = computeAmortizationSchedule(loanAmount, monthlyRate, amortizationYears);
    const balanceAtReset =
      fixedMonth <= amort.schedule.length && fixedMonth > 0
        ? amort.schedule[fixedMonth - 1].balance
        : loanAmount;
    const adjustedRate = (interestRatePct + armAdjustmentPct) / 100;
    const resetPayment = computeMonthlyPayment(balanceAtReset, adjustedRate, remainingYears);
    const previousPayment = monthlyDebtService;
    const newPayment = resetPayment;
    const increaseAmount = Number((newPayment - previousPayment).toFixed(2));
    const percentageIncrease = previousPayment > 0 ? Number(((increaseAmount / previousPayment) * 100).toFixed(1)) : 0;
    const signPrefix = armAdjustmentPct >= 0 ? '+' : '';
    const disclosureLabel = `Payment rises to $${Math.round(newPayment).toLocaleString()} in year ${resetYear} (${signPrefix}${armAdjustmentPct}% rate adjustment)`;

    paymentShock = {
      year: resetYear,
      previousMonthlyPayment: previousPayment,
      newMonthlyPayment: newPayment,
      monthlyIncreaseAmount: increaseAmount,
      percentageIncrease,
      disclosureLabel,
    };
  }

  // Performance Ratios
  const capRateOnCost =
    totalCostBasis > 0 ? Number(((netOperatingIncome / totalCostBasis) * 100).toFixed(1)) : 0;
  const cashOnCashReturnPct =
    cashRequired > 0 ? Number(((annualNetCashFlow / cashRequired) * 100).toFixed(1)) : 0;
  const dscr =
    annualDebtService > 0 ? Number((netOperatingIncome / annualDebtService).toFixed(2)) : null;
  const ltvPct =
    purchasePrice > 0 ? Number(((loanAmount / purchasePrice) * 100).toFixed(1)) : 0;
  const grossRentMultiplier =
    grossAnnualRent > 0 ? Number((purchasePrice / grossAnnualRent).toFixed(1)) : null;

  // MAO (70% Rule)
  const maoCalc = computeMAO(estimatedARV, rehabBudget, 0.70, buyerClosingCostsAmount);
  const maximumAllowableOffer70Pct = maoCalc.mao;

  // Projected Flip Profit (ARV - Basis - Cost of Sale - Holding Debt Service)
  const costOfSalePct = inputs.costOfSalePct ?? 5.0;
  const flipHoldMonths = inputs.holdPeriodYears ? inputs.holdPeriodYears * 12 : 6;
  const estimatedHoldingDebt = Math.round(monthlyDebtService * flipHoldMonths);
  const estimatedSellingCosts = Math.round(estimatedARV * (costOfSalePct / 100));
  const projectedFlipProfit = Math.round(
    estimatedARV - totalCostBasis - estimatedSellingCosts - estimatedHoldingDebt,
  );

  // ── 3. Terminal Value Method & Valuation (W2-06 Discipline) ────────────────
  if (!inputs.terminalValueMethod && !inputs.allowDefaultTerminalMethod) {
    throw new TerminalValueMethodRequiredError(
      'Terminal value method not selected — choose appreciation_pct, exit_cap, or per_unit.',
    );
  }
  const terminalValueMethod: 'appreciation_pct' | 'exit_cap' | 'per_unit' =
    inputs.terminalValueMethod ?? 'appreciation_pct';

  const holdPeriodYears = inputs.holdPeriodYears ?? 5;
  const annualAppreciationPct = inputs.appreciationPct ?? inputs.annualAppreciationPct ?? 3.0;
  const rentGrowthPct = inputs.rentGrowthPct ?? 0.0;
  const expenseGrowthPct = inputs.expenseGrowthPct ?? 0.0;
  const sellingCostsPct = inputs.sellingCostsPct ?? inputs.costOfSalePct ?? 6.0;
  const exitCapRatePct = inputs.exitCapRatePct ?? 6.5;

  // Escalate terminal NOI for exit_cap method if growth is specified
  const terminalRentFactor = Math.pow(1 + rentGrowthPct / 100, holdPeriodYears - 1);
  const terminalExpFactor = Math.pow(1 + expenseGrowthPct / 100, holdPeriodYears - 1);
  const terminalGoi = Math.round(grossOperatingIncome * terminalRentFactor);
  const terminalOpEx = Math.round(totalOperatingExpenses * terminalExpFactor);
  const terminalNoi = terminalGoi - terminalOpEx;

  let estimatedExitValue = 0;
  let terminalValueLabel = '';

  switch (terminalValueMethod) {
    case 'appreciation_pct': {
      const appreciationBase = inputs.appreciationBase ?? 'purchase_price';
      const baseAmount =
        appreciationBase === 'arv' && inputs.estimatedARV && inputs.estimatedARV > 0
          ? inputs.estimatedARV
          : purchasePrice;
      estimatedExitValue = Math.round(
        baseAmount * Math.pow(1 + annualAppreciationPct / 100, holdPeriodYears),
      );
      const baseName = appreciationBase === 'arv' ? 'ARV' : 'purchase price';
      terminalValueLabel = `Exit @ ${annualAppreciationPct.toFixed(1)}%/yr on $${baseAmount.toLocaleString()} ${baseName}`;
      break;
    }
    case 'exit_cap':
      estimatedExitValue =
        exitCapRatePct > 0 && terminalNoi > 0
          ? Math.round(terminalNoi / (exitCapRatePct / 100))
          : 0;
      terminalValueLabel = `Exit @ ${exitCapRatePct.toFixed(1)}% cap on Y${holdPeriodYears} NOI`;
      break;
    case 'per_unit': {
      const units = inputs.unitsCount ?? 1;
      const perUnit =
        inputs.perUnitExitValue !== undefined
          ? inputs.perUnitExitValue
          : (purchasePrice > 0 ? Math.round(purchasePrice / units) : 0);
      estimatedExitValue = Math.round(units * perUnit);
      terminalValueLabel = `Exit @ $${perUnit.toLocaleString()}/unit`;
      break;
    }
  }

  // ── 4. Projected IRR Solver (W2-05 Hardened DCF Equity IRR & W2-09 Progression) ─
  let projectedIrrPct: number | null = null;
  let irrStatus: IrrStatus = 'no_sign_change';
  let irrRoots: IrrRoot[] = [];
  let irrCashFlowVector: number[] = cashRequired > 0 ? [-cashRequired] : [];
  let annualProjections: import('./projected-irr.js').AnnualProjectionItem[] = [];

  if (cashRequired > 0) {
    const irrBreakdown = calculateProjectedIrrDetails({
      totalCashInvested: cashRequired,
      annualPreTaxCashFlow: annualNetCashFlow,
      purchasePrice,
      loanAmount,
      interestRatePct,
      amortizationYears,
      holdPeriodYears,
      annualAppreciationPct,
      sellingCostsPct,
      exitValue: estimatedExitValue,
      rentGrowthPct,
      expenseGrowthPct,
      grossAnnualRent,
      vacancyRatePct,
      totalOperatingExpenses,
      annualDebtService,
      otherAnnualIncome,
      loanType,
      ioPeriodYears,
      armFixedPeriodYears,
      armAdjustmentPct,
      stabilizationMonths,
      monthsVacantAtClose,
      concessionsMonths,
      leaseUpRentRampPct,
    });
    projectedIrrPct = irrBreakdown.projectedIrrPct;
    irrStatus = irrBreakdown.irrStatus;
    irrRoots = irrBreakdown.roots;
    irrCashFlowVector = irrBreakdown.cashFlowVector;
    annualProjections = irrBreakdown.annualProjections;
  }

  // ── 5. Negative Leverage Detection (W2-08) ─────────────────────────────────
  const loanConstantPct =
    loanAmount > 0 ? Number(((annualDebtService / loanAmount) * 100).toFixed(3)) : 0;
  const yieldOnCostPct = capRateOnCost;
  const isNegativeLeverage = yieldOnCostPct < loanConstantPct || cashOnCashReturnPct < 0;

  return {
    totalCostBasis,
    loanAmount,
    cashRequired,
    buyerClosingCostsAmount,
    grossOperatingIncome,
    totalOperatingExpenses,
    netOperatingIncome,
    monthlyDebtService,
    annualDebtService,
    annualNetCashFlow,
    monthlyNetCashFlow,
    capRateOnCost,
    cashOnCashReturnPct,
    projectedIrrPct,
    irrStatus,
    irrRoots,
    irrCashFlowVector,
    terminalValueMethod,
    terminalValueLabel,
    estimatedExitValue,
    projectedFlipProfit,
    dscr,
    ltvPct,
    grossRentMultiplier,
    maximumAllowableOffer70Pct,
    loanConstantPct,
    yieldOnCostPct,
    isNegativeLeverage,
    rentGrowthPct,
    expenseGrowthPct,
    annualAppreciationPct,
    annualProjections,
    loanType,
    ioPeriodYears,
    armFixedPeriodYears,
    armAdjustmentPct,
    paymentShock,
    stabilizationMonths,
    monthsVacantAtClose,
    concessionsMonths,
    leaseUpRentRampPct,
    isLeaseUpActive,
    stabilizedGrossOperatingIncome,
    stabilizedNetOperatingIncome,
    stabilizedAnnualCashFlow,
    appreciationBase: terminalValueMethod === 'appreciation_pct' ? (inputs.appreciationBase ?? 'purchase_price') : undefined,
    sensitivityGrids:
      inputs.computeSensitivityGrids !== false && cashRequired > 0
        ? computeSensitivityGrids({
            ...inputs,
            computeSensitivityGrids: false,
          })
        : undefined,
    calculatedAt: new Date().toISOString(),
    engineVersion: `${ENGINE_VERSION}.0.0`,
  };
}

// ── 3. Deal Calculator → Project Handoff Transformation ────────────────────────

export interface TransformCalculatorInput {
  address: string;
  projectName?: string;
  purchasePrice: number;
  rehabBudget?: number;
  buyerClosingCostsPct?: number;
  estimatedARV?: number | null;
  grossRentMonthly?: number;
  operatingExpenseRatioPct?: number;
  targetLtvPct?: number;
  interestRatePct?: number;
  amortizationYears?: number;
  strategy?: 'flip' | 'brrrr' | 'buy_and_hold_rental' | 'short_term_rental_airbnb' | 'commercial_value_add' | 'wholesale';
  terminalValueMethod?: 'appreciation_pct' | 'exit_cap' | 'per_unit';
  /** W2-14: Appreciation calculation base ('purchase_price' | 'arv', default 'purchase_price') */
  appreciationBase?: 'purchase_price' | 'arv';
  rentGrowthPct?: number;
  expenseGrowthPct?: number;
  appreciationPct?: number;
  annualAppreciationPct?: number;
  loanType?: 'amortizing' | 'interest_only' | 'arm';
  ioPeriodYears?: number;
  armFixedPeriodYears?: number;
  armAdjustmentPct?: number;
  /** W2-11: Lease-up and stabilization duration in months */
  stabilizationMonths?: number;
  /** W2-11: Initial months completely vacant immediately after closing */
  monthsVacantAtClose?: number;
  /** W2-11: Concessions in months of free rent granted */
  concessionsMonths?: number;
  /** W2-11: Rent ramp % during active lease-up months */
  leaseUpRentRampPct?: number;
  createdByUid: string;
  organizationId?: string;
  assumptionsNotes?: string;
}

export interface TransformedProjectPayload {
  id: string;
  propertyName: string;
  address: string;
  property_address: string;
  purchasePrice: number;
  purchase_price: number;
  rehab_costs: number;
  estimatedExitValue: number | null;
  currentPhase: 1;
  phase: 'acquisition';
  status: 'acquisition';
  acquisitionStatus: 'lead' | 'analyzing';
  ownerUid: string;
  organizationId?: string;
  ianaTimezone: string;
  underwritingSnapshot: {
    snapshotId: string;
    version: number;
    createdAt: string;
    createdByUid: string;
    source: 'deal_calculator';
    calculatorVersion: string;
    inputs: Record<string, unknown>;
    outputs: ReconciledUnderwritingMetrics;
    assumptions: { notes?: string };
  };
  downstreamSeeding: {
    hold: {
      budget: { allocatedTotal: number };
    };
    fund: {
      loan: {
        targetLoanAmount: number;
        targetLtvPct: number;
        interestRatePct: number;
      };
    };
  };
}

/**
 * Transforms Deal Calculator inputs into a canonical Project creation payload
 * with immutable underwriting lineage and downstream phase seeding.
 */
export function transformCalculatorToProject(
  input: TransformCalculatorInput,
): TransformedProjectPayload {
  let metrics: ReconciledUnderwritingMetrics | null = null;
  if (input.estimatedARV && input.estimatedARV > 0) {
    try {
      metrics = reconcileAcquisitionUnderwriting({
        purchasePrice: input.purchasePrice,
        rehabBudget: input.rehabBudget,
        buyerClosingCostsPct: input.buyerClosingCostsPct,
        estimatedARV: input.estimatedARV,
        grossRentMonthly: input.grossRentMonthly,
        operatingExpenseRatioPct: input.operatingExpenseRatioPct,
        targetLtvPct: input.targetLtvPct,
        interestRatePct: input.interestRatePct,
        amortizationYears: input.amortizationYears,
        strategy: input.strategy,
        terminalValueMethod: input.terminalValueMethod ?? 'appreciation_pct',
        appreciationBase: input.appreciationBase,
        rentGrowthPct: input.rentGrowthPct,
        expenseGrowthPct: input.expenseGrowthPct,
        appreciationPct: input.appreciationPct ?? input.annualAppreciationPct,
        loanType: input.loanType,
        ioPeriodYears: input.ioPeriodYears,
        armFixedPeriodYears: input.armFixedPeriodYears,
        armAdjustmentPct: input.armAdjustmentPct,
        stabilizationMonths: input.stabilizationMonths,
        monthsVacantAtClose: input.monthsVacantAtClose,
        concessionsMonths: input.concessionsMonths,
        leaseUpRentRampPct: input.leaseUpRentRampPct,
        allowDefaultTerminalMethod: true,
      });
    } catch {
      metrics = null;
    }
  }

  const generatedId = `proj-${Date.now().toString().slice(-6)}`;
  const snapshotId = `snap-${Date.now().toString().slice(-8)}`;
  const resolvedName =
    input.projectName || (input.address ? input.address.split(',')[0].trim() : '') || 'New Investment Deal';

  return {
    id: generatedId,
    propertyName: resolvedName,
    address: input.address || '',
    property_address: input.address || '',
    purchasePrice: input.purchasePrice,
    purchase_price: input.purchasePrice,
    rehab_costs: input.rehabBudget ?? 0,
    estimatedExitValue: input.estimatedARV ?? null,
    currentPhase: 1,
    phase: 'acquisition',
    status: 'acquisition',
    acquisitionStatus: 'analyzing',
    ownerUid: input.createdByUid,
    organizationId: input.organizationId,
    ianaTimezone: deriveIanaTimezoneFromAddress(input.address || ''),
    underwritingSnapshot: {
      snapshotId,
      version: 1,
      createdAt: new Date().toISOString(),
      createdByUid: input.createdByUid,
      source: 'deal_calculator',
      calculatorVersion: '1.0.0',
      inputs: {
        strategy: input.strategy ?? 'buy_and_hold_rental',
        purchasePrice: input.purchasePrice,
        rehabBudget: input.rehabBudget ?? 0,
        estimatedARV: input.estimatedARV ?? null,
        grossMonthlyRent: input.grossRentMonthly ?? 0,
        operatingExpenseRatioPct: input.operatingExpenseRatioPct ?? 35.0,
        targetLtvPct: input.targetLtvPct ?? 75.0,
        interestRatePct: input.interestRatePct ?? 6.5,
        amortizationYears: input.amortizationYears ?? 30,
        rentGrowthPct: input.rentGrowthPct ?? 0.0,
        expenseGrowthPct: input.expenseGrowthPct ?? 0.0,
        appreciationPct: input.appreciationPct ?? input.annualAppreciationPct ?? 3.0,
        terminalValueMethod: input.terminalValueMethod ?? 'appreciation_pct',
        appreciationBase: input.appreciationBase ?? 'purchase_price',
        loanType: input.loanType ?? 'amortizing',
        ioPeriodYears: input.ioPeriodYears ?? 5,
        armFixedPeriodYears: input.armFixedPeriodYears ?? 5,
        armAdjustmentPct: input.armAdjustmentPct ?? 2.0,
        stabilizationMonths: input.stabilizationMonths ?? 0,
        monthsVacantAtClose: input.monthsVacantAtClose ?? 0,
        concessionsMonths: input.concessionsMonths ?? 0,
        leaseUpRentRampPct: input.leaseUpRentRampPct ?? 100.0,
      },
      outputs: metrics as any,
      assumptions: {
        notes: input.assumptionsNotes,
      },
    },
    downstreamSeeding: {
      hold: {
        budget: {
          allocatedTotal: input.rehabBudget ?? 0,
        },
      },
      fund: {
        loan: {
          targetLoanAmount: metrics?.loanAmount ?? Math.round(input.purchasePrice * ((input.targetLtvPct ?? 75.0) / 100)),
          targetLtvPct: input.targetLtvPct ?? 75.0,
          interestRatePct: input.interestRatePct ?? 6.5,
        },
      },
    },
  };
}

// ── 4. Automated Task Generation for "Under Contract" ─────────────────────────

export interface GeneratedAcquisitionTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending';
  isAutoGenerated: true;
  sortOrder: number;
}

export interface TaskGenerationConfig {
  projectId: string;
  executionDate: Date | string;
  closingDate: Date | string;
  inspectionPeriodDays?: number; // Default 10
  financingContingencyDays?: number; // Default 21
  appraisalContingencyDays?: number; // Default 14
}

/**
 * Instantiates the 11 canonical acquisition milestone tasks when a deal enters "Under Contract".
 */
export function generateUnderContractTasks(
  config: TaskGenerationConfig,
): GeneratedAcquisitionTask[] {
  const exec = new Date(config.executionDate);
  const closing = new Date(config.closingDate);
  const inspDays = config.inspectionPeriodDays ?? 10;
  const finDays = config.financingContingencyDays ?? 21;

  const addDays = (base: Date, days: number): string => {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString();
  };

  const subtractDays = (base: Date, days: number): string => {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString();
  };

  const inspDeadline = new Date(exec);
  inspDeadline.setUTCDate(inspDeadline.getUTCDate() + inspDays);

  const finDeadline = new Date(exec);
  finDeadline.setUTCDate(finDeadline.getUTCDate() + finDays);

  return [
    {
      id: `task-emd-${Date.now()}-1`,
      projectId: config.projectId,
      title: 'Wire Earnest Money Deposit (EMD)',
      description: 'Deliver required earnest money to designated escrow or title holder.',
      dueDate: addDays(exec, 3),
      status: 'pending',
      isAutoGenerated: true,
      sortOrder: 1,
    },
    {
      id: `task-insp-${Date.now()}-2`,
      projectId: config.projectId,
      title: 'Schedule General Property Inspection',
      description: 'Book licensed home or commercial inspector to assess physical systems.',
      dueDate: addDays(exec, 2),
      status: 'pending',
      isAutoGenerated: true,
      sortOrder: 2,
    },
    {
      id: `task-title-${Date.now()}-3`,
      projectId: config.projectId,
      title: 'Request Title Search & Commitment',
      description: 'Order title examination from closing agent to check liens and easements.',
      dueDate: addDays(exec, 2),
      status: 'pending',
      isAutoGenerated: true,
      sortOrder: 3,
    },
    {
      id: `task-appr-${Date.now()}-4`,
      projectId: config.projectId,
      title: 'Order Property Appraisal',
      description: 'Confirm lender appraisal has been requested or order private valuation.',
      dueDate: addDays(exec, 3),
      status: 'pending',
      isAutoGenerated: true,
      sortOrder: 4,
    },
    {
      id: `task-sow-${Date.now()}-5`,
      projectId: config.projectId,
      title: 'Conduct Contractor Scope of Work (SOW) Walk',
      description: 'Tour property with general contractor to finalize line-item rehab bids.',
      dueDate: subtractDays(inspDeadline, 2),
      status: 'pending',
      isAutoGenerated: true,
      sortOrder: 5,
    },
    {
      id: `task-env-${Date.now()}-6`,
      projectId: config.projectId,
      title: 'Review Environmental & Municipal Records',
      description: 'Audit municipal lien search, zoning verification, and environmental history.',
      dueDate: subtractDays(inspDeadline, 3),
      status: 'pending',
      isAutoGenerated: true,
      sortOrder: 6,
    },
    {
      id: `task-rentroll-${Date.now()}-7`,
      projectId: config.projectId,
      title: 'Collect & Audit Tenant Rent Roll',
      description: 'Inspect current lease agreements, security deposits, and payment ledgers.',
      dueDate: addDays(exec, 5),
      status: 'pending',
      isAutoGenerated: true,
      sortOrder: 7,
    },
    {
      id: `task-waive-insp-${Date.now()}-8`,
      projectId: config.projectId,
      title: 'Satisfy or Waive Inspection Contingency',
      description: 'Formally submit inspection removal or negotiate repair concessions with seller.',
      dueDate: subtractDays(inspDeadline, 1),
      status: 'pending',
      isAutoGenerated: true,
      sortOrder: 8,
    },
    {
      id: `task-clear-close-${Date.now()}-9`,
      projectId: config.projectId,
      title: 'Confirm Loan Approval / Clear-to-Close',
      description: 'Receive formal mortgage loan commitment letter from lender.',
      dueDate: subtractDays(finDeadline, 2),
      status: 'pending',
      isAutoGenerated: true,
      sortOrder: 9,
    },
    {
      id: `task-alta-${Date.now()}-10`,
      projectId: config.projectId,
      title: 'Review Preliminary Closing Disclosure (ALTA)',
      description: 'Reconcile settlement statement credits, prorations, and cash-to-close.',
      dueDate: subtractDays(closing, 3),
      status: 'pending',
      isAutoGenerated: true,
      sortOrder: 10,
    },
    {
      id: `task-wire-${Date.now()}-11`,
      projectId: config.projectId,
      title: 'Initiate Final Closing Wire',
      description: 'Verify wire instructions verbally and transfer remaining buyer funds.',
      dueDate: subtractDays(closing, 1),
      status: 'pending',
      isAutoGenerated: true,
      sortOrder: 11,
    },
  ];
}
