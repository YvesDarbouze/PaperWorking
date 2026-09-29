import { computeMonthlyPayment } from './amortization-engine.js';

// ── 1. Short-Term Rental (Airbnb) Engine ──────────────────────────────────────

export interface ShortTermRentalInputs {
  purchasePrice: number;
  totalCostBasis: number;
  cashRequired: number;
  annualDebtService: number;
  averageDailyRate?: number;
  occupancyRatePct?: number;
  cleaningFeePerStay?: number;
  averageStayNights?: number;
  cleaningCostPerStay?: number;
  platformFeePct?: number;
  annualPropertyTax?: number;
  annualInsurance?: number;
  annualUtilities?: number;
  annualMaintenance?: number;
  otherOperatingExpensesAnnual?: number;
  strFurnishingCapex?: number;
}

export interface ShortTermRentalMetrics {
  bookedNightsYear: number;
  estimatedStaysCount: number;
  grossNightlyRevenue: number;
  cleaningFeeRevenue: number;
  grossAnnualRevenue: number;
  monthlyAverageGrossRevenue: number;
  platformFeesAnnual: number;
  cleaningCostsAnnual: number;
  totalOperatingExpenses: number;
  netOperatingIncome: number;
  totalCashInvested: number;
  annualNetCashFlow: number;
  monthlyNetCashFlow: number;
  cashOnCashReturnPct: number;
  capRateOnCost: number;
  expenseRatioPct: number;
}

export function computeShortTermRentalMetrics(inputs: ShortTermRentalInputs): ShortTermRentalMetrics {
  const adr = Math.max(0, inputs.averageDailyRate ?? 220);
  const occupancyPct = Math.max(0, Math.min(100, inputs.occupancyRatePct ?? 70.0));
  const cleaningFee = Math.max(0, inputs.cleaningFeePerStay ?? 150);
  const stayNights = Math.max(1, inputs.averageStayNights ?? 3.5);
  const cleaningCost = Math.max(0, inputs.cleaningCostPerStay ?? 120);
  const platformFeePct = Math.max(0, Math.min(25, inputs.platformFeePct ?? 3.0));
  const furnishing = Math.max(0, inputs.strFurnishingCapex ?? 20000);

  const bookedNightsYear = Math.round((365 * occupancyPct) / 100);
  const estimatedStaysCount = Math.max(1, Math.round(bookedNightsYear / stayNights));
  const grossNightlyRevenue = bookedNightsYear * adr;
  const cleaningFeeRevenue = estimatedStaysCount * cleaningFee;
  const grossAnnualRevenue = grossNightlyRevenue + cleaningFeeRevenue;
  const monthlyAverageGrossRevenue = Math.round(grossAnnualRevenue / 12);

  const platformFeesAnnual = Math.round(grossNightlyRevenue * (platformFeePct / 100));
  const cleaningCostsAnnual = estimatedStaysCount * cleaningCost;
  const fixedOpex =
    (inputs.annualPropertyTax ?? 0) +
    (inputs.annualInsurance ?? 0) +
    (inputs.annualUtilities ?? 0) +
    (inputs.annualMaintenance ?? 0) +
    (inputs.otherOperatingExpensesAnnual ?? 0);
  const totalOperatingExpenses = platformFeesAnnual + cleaningCostsAnnual + fixedOpex;
  const netOperatingIncome = grossAnnualRevenue - totalOperatingExpenses;

  const totalCashInvested = Math.max(0, inputs.cashRequired + furnishing);
  const annualDebtService = Math.max(0, inputs.annualDebtService);
  const annualNetCashFlow = netOperatingIncome - annualDebtService;
  const monthlyNetCashFlow = Math.round(annualNetCashFlow / 12);

  const cashOnCashReturnPct =
    totalCashInvested > 0 ? Number(((annualNetCashFlow / totalCashInvested) * 100).toFixed(1)) : 0;
  const capRateOnCost =
    inputs.totalCostBasis > 0 ? Number(((netOperatingIncome / inputs.totalCostBasis) * 100).toFixed(1)) : 0;
  const expenseRatioPct =
    grossAnnualRevenue > 0 ? Number(((totalOperatingExpenses / grossAnnualRevenue) * 100).toFixed(1)) : 0;

  return {
    bookedNightsYear,
    estimatedStaysCount,
    grossNightlyRevenue,
    cleaningFeeRevenue,
    grossAnnualRevenue,
    monthlyAverageGrossRevenue,
    platformFeesAnnual,
    cleaningCostsAnnual,
    totalOperatingExpenses,
    netOperatingIncome,
    totalCashInvested,
    annualNetCashFlow,
    monthlyNetCashFlow,
    cashOnCashReturnPct,
    capRateOnCost,
    expenseRatioPct,
  };
}

// ── 2. Fix & Flip Strategy Engine ─────────────────────────────────────────────

export interface FixAndFlipInputs {
  purchasePrice: number;
  rehabBudget: number;
  buyerClosingCosts: number;
  estimatedARV: number;
  holdPeriodMonths?: number;
  sellingCostsPct?: number;
  monthlyDebtService?: number;
  monthlyHoldingCosts?: number;
  hardMoneyPoints?: number;
  loanAmount?: number;
  shortTermTaxRatePct?: number;
}

export interface FixAndFlipMetrics {
  totalRehabBudget: number;
  holdingCostDebtTotal: number;
  holdingCostOperationsTotal: number;
  totalHoldingCosts: number;
  loanOriginationPointsAmount: number;
  totalCostBasis: number;
  estimatedSellingCosts: number;
  netSalesProceeds: number;
  netFlipProfit: number;
  profitMarginOnArvPct: number;
  roiOnTotalCostPct: number;
  annualizedRoiPct: number;
  totalCashInvested: number;
  isProfitable: boolean;
  shortTermTaxRatePct: number;
  estimatedShortTermTax: number;
  afterTaxNetFlipProfit: number;
}

export function computeFixAndFlipMetrics(inputs: FixAndFlipInputs): FixAndFlipMetrics {
  const purchasePrice = Math.max(0, inputs.purchasePrice);
  const rehabBudget = Math.max(0, inputs.rehabBudget);
  const closingCosts = Math.max(0, inputs.buyerClosingCosts);
  const arv = Math.max(0, inputs.estimatedARV);
  const holdMonths = Math.max(1, inputs.holdPeriodMonths ?? 6);
  const sellingCostsPct = Math.max(0, Math.min(15, inputs.sellingCostsPct ?? 6.0));
  const monthlyDebt = Math.max(0, inputs.monthlyDebtService ?? 0);
  const monthlyHolding = Math.max(0, inputs.monthlyHoldingCosts ?? 450);
  const points = Math.max(0, inputs.hardMoneyPoints ?? 0);
  const loanAmount = Math.max(0, inputs.loanAmount ?? 0);
  const shortTermTaxRatePct = Math.max(0, Math.min(60, inputs.shortTermTaxRatePct ?? 25.0));

  const holdingCostDebtTotal = Math.round(monthlyDebt * holdMonths);
  const holdingCostOperationsTotal = Math.round(monthlyHolding * holdMonths);
  const loanOriginationPointsAmount = Math.round(loanAmount * (points / 100));
  const totalHoldingCosts = holdingCostDebtTotal + holdingCostOperationsTotal + loanOriginationPointsAmount;

  const totalCostBasis = purchasePrice + closingCosts + rehabBudget + totalHoldingCosts;
  const estimatedSellingCosts = Math.round(arv * (sellingCostsPct / 100));
  const netSalesProceeds = arv - estimatedSellingCosts;
  const netFlipProfit = netSalesProceeds - totalCostBasis;

  const profitMarginOnArvPct = arv > 0 ? Number(((netFlipProfit / arv) * 100).toFixed(1)) : 0;
  const roiOnTotalCostPct = totalCostBasis > 0 ? Number(((netFlipProfit / totalCostBasis) * 100).toFixed(1)) : 0;

  const totalCashInvested = Math.max(1, totalCostBasis - loanAmount);
  const annualizedRoiPct = Number(
    ((netFlipProfit / totalCashInvested) * (12 / holdMonths) * 100).toFixed(1),
  );

  const estimatedShortTermTax = netFlipProfit > 0 ? Math.round(netFlipProfit * (shortTermTaxRatePct / 100)) : 0;
  const afterTaxNetFlipProfit = netFlipProfit - estimatedShortTermTax;

  return {
    totalRehabBudget: rehabBudget,
    holdingCostDebtTotal,
    holdingCostOperationsTotal,
    totalHoldingCosts,
    loanOriginationPointsAmount,
    totalCostBasis,
    estimatedSellingCosts,
    netSalesProceeds,
    netFlipProfit,
    profitMarginOnArvPct,
    roiOnTotalCostPct,
    annualizedRoiPct,
    totalCashInvested,
    isProfitable: netFlipProfit > 0,
    shortTermTaxRatePct,
    estimatedShortTermTax,
    afterTaxNetFlipProfit,
  };
}

// ── 3. BRRRR Strategy Engine ──────────────────────────────────────────────────

export interface BrrrrInputs {
  purchasePrice: number;
  rehabBudget: number;
  buyerClosingCosts: number;
  initialLoanAmount: number;
  estimatedARV: number;
  refinanceMonthsAfterClose?: number;
  refinanceLtvPct?: number;
  refinanceInterestRatePct?: number;
  refinanceAmortizationYears?: number;
  refinanceClosingCostsPct?: number;
  postRefiGrossMonthlyRent?: number;
  postRefiMonthlyOperatingExpenses?: number;
}

export interface BrrrrMetrics {
  initialTotalCostBasis: number;
  initialCashRequired: number;
  newRefinanceLoanAmount: number;
  refinanceClosingCostsAmount: number;
  cashOutGrossProceeds: number;
  netCashLeftInDeal: number;
  capitalRecoveredPct: number;
  isPerfectBrrrr: boolean;
  postRefiMonthlyDebtService: number;
  postRefiMonthlyNetCashFlow: number;
  postRefiAnnualCashFlow: number;
  postRefiCashOnCashReturnPct: number | null;
  postRefiDebtServiceCoverageRatio: number | null;
}

export function computeBrrrrMetrics(inputs: BrrrrInputs): BrrrrMetrics {
  const purchasePrice = Math.max(0, inputs.purchasePrice);
  const rehabBudget = Math.max(0, inputs.rehabBudget);
  const closingCosts = Math.max(0, inputs.buyerClosingCosts);
  const initialLoan = Math.max(0, inputs.initialLoanAmount);
  const arv = Math.max(0, inputs.estimatedARV);

  const refiLtvPct = Math.max(0, Math.min(100, inputs.refinanceLtvPct ?? 75.0));
  const refiRatePct = Math.max(0, inputs.refinanceInterestRatePct ?? 6.5);
  const refiAmortYears = Math.max(1, inputs.refinanceAmortizationYears ?? 30);
  const refiClosingCostsPct = Math.max(0, inputs.refinanceClosingCostsPct ?? 2.0);

  const initialTotalCostBasis = purchasePrice + rehabBudget + closingCosts;
  const initialCashRequired = Math.max(0, initialTotalCostBasis - initialLoan);

  const newRefinanceLoanAmount = Math.round(arv * (refiLtvPct / 100));
  const refinanceClosingCostsAmount = Math.round(newRefinanceLoanAmount * (refiClosingCostsPct / 100));
  const cashOutGrossProceeds = Math.max(0, newRefinanceLoanAmount - initialLoan - refinanceClosingCostsAmount);

  const netCashLeftInDeal = Math.max(0, initialCashRequired - cashOutGrossProceeds);
  const capitalRecoveredPct =
    initialCashRequired > 0
      ? Math.min(100, Number(((cashOutGrossProceeds / initialCashRequired) * 100).toFixed(1)))
      : 100;
  const isPerfectBrrrr = cashOutGrossProceeds >= initialCashRequired;

  const postRefiMonthlyDebtService =
    newRefinanceLoanAmount > 0
      ? computeMonthlyPayment(newRefinanceLoanAmount, refiRatePct / 100, refiAmortYears)
      : 0;

  const rentMonthly = Math.max(0, inputs.postRefiGrossMonthlyRent ?? 0);
  const opexMonthly = Math.max(0, inputs.postRefiMonthlyOperatingExpenses ?? 0);
  const postRefiMonthlyNetCashFlow = Math.round(rentMonthly - opexMonthly - postRefiMonthlyDebtService);
  const postRefiAnnualCashFlow = postRefiMonthlyNetCashFlow * 12;

  const postRefiCashOnCashReturnPct = isPerfectBrrrr
    ? null
    : netCashLeftInDeal > 0
      ? Number(((postRefiAnnualCashFlow / netCashLeftInDeal) * 100).toFixed(1))
      : 0;

  const noiMonthly = rentMonthly - opexMonthly;
  const postRefiDebtServiceCoverageRatio =
    postRefiMonthlyDebtService > 0 ? Number((noiMonthly / postRefiMonthlyDebtService).toFixed(2)) : null;

  return {
    initialTotalCostBasis,
    initialCashRequired,
    newRefinanceLoanAmount,
    refinanceClosingCostsAmount,
    cashOutGrossProceeds,
    netCashLeftInDeal,
    capitalRecoveredPct,
    isPerfectBrrrr,
    postRefiMonthlyDebtService,
    postRefiMonthlyNetCashFlow,
    postRefiAnnualCashFlow,
    postRefiCashOnCashReturnPct,
    postRefiDebtServiceCoverageRatio,
  };
}

// ── 4. Commercial & Multi-Family Engine ───────────────────────────────────────

export interface CommercialInputs {
  purchasePrice: number;
  unitCount?: number;
  averageRentPerUnitMonthly?: number;
  otherIncomeMonthly?: number;
  commercialSqft?: number;
  vacancyRatePct?: number;
  operatingExpenseRatioPct?: number;
  operatingExpensesAnnualOverride?: number;
  loanAmount: number;
  annualDebtService: number;
  marketCapRatePct?: number;
  totalCostBasis: number;
  cashRequired: number;
}

export interface CommercialMetrics {
  potentialGrossIncomeAnnual: number;
  effectiveGrossIncomeAnnual: number;
  totalOperatingExpensesAnnual: number;
  netOperatingIncome: number;
  debtCoverageRatio: number | null;
  debtYieldPct: number | null;
  capRateOnCostPct: number;
  impliedMarketValuation: number;
  grossRentMultiplier: number | null;
  breakEvenOccupancyPct: number | null;
  annualNetCashFlow: number;
  monthlyNetCashFlow: number;
  cashOnCashReturnPct: number;
  annualDebtService: number;
}

export function computeCommercialMetrics(inputs: CommercialInputs): CommercialMetrics {
  const purchasePrice = Math.max(0, inputs.purchasePrice);
  const units = Math.max(1, inputs.unitCount ?? 1);
  const avgRent = Math.max(0, inputs.averageRentPerUnitMonthly ?? 0);
  const otherIncomeMonthly = Math.max(0, inputs.otherIncomeMonthly ?? 0);
  const vacancyRatePct = Math.max(0, Math.min(100, inputs.vacancyRatePct ?? 6.0));
  const opexRatioPct = Math.max(0, Math.min(100, inputs.operatingExpenseRatioPct ?? 38.0));
  const marketCapPct = Math.max(0.1, inputs.marketCapRatePct ?? 6.5);

  const potentialRentAnnual = units * avgRent * 12;
  const otherIncomeAnnual = otherIncomeMonthly * 12;
  const potentialGrossIncomeAnnual = potentialRentAnnual + otherIncomeAnnual;

  const vacancyLossAnnual = Math.round(potentialGrossIncomeAnnual * (vacancyRatePct / 100));
  const effectiveGrossIncomeAnnual = potentialGrossIncomeAnnual - vacancyLossAnnual;

  const totalOperatingExpensesAnnual =
    inputs.operatingExpensesAnnualOverride !== undefined
      ? Math.round(inputs.operatingExpensesAnnualOverride)
      : Math.round(effectiveGrossIncomeAnnual * (opexRatioPct / 100));

  const netOperatingIncome = effectiveGrossIncomeAnnual - totalOperatingExpensesAnnual;
  const annualDebtService = Math.max(0, inputs.annualDebtService);

  const debtCoverageRatio =
    annualDebtService > 0 ? Number((netOperatingIncome / annualDebtService).toFixed(2)) : null;
  const debtYieldPct =
    inputs.loanAmount > 0 ? Number(((netOperatingIncome / inputs.loanAmount) * 100).toFixed(2)) : null;

  const capRateOnCostPct =
    inputs.totalCostBasis > 0 ? Number(((netOperatingIncome / inputs.totalCostBasis) * 100).toFixed(2)) : 0;
  const impliedMarketValuation =
    marketCapPct > 0 && netOperatingIncome > 0
      ? Math.round(netOperatingIncome / (marketCapPct / 100))
      : purchasePrice;

  const grossRentMultiplier =
    potentialRentAnnual > 0 ? Number((purchasePrice / potentialRentAnnual).toFixed(1)) : null;

  const breakEvenOccupancyPct =
    potentialRentAnnual > 0
      ? Number(
          (
            ((totalOperatingExpensesAnnual + annualDebtService - otherIncomeAnnual) /
              potentialRentAnnual) *
            100
          ).toFixed(1),
        )
      : null;

  const annualNetCashFlow = netOperatingIncome - annualDebtService;
  const monthlyNetCashFlow = Math.round(annualNetCashFlow / 12);
  const cashOnCashReturnPct =
    inputs.cashRequired > 0 ? Number(((annualNetCashFlow / inputs.cashRequired) * 100).toFixed(1)) : 0;

  return {
    potentialGrossIncomeAnnual,
    effectiveGrossIncomeAnnual,
    totalOperatingExpensesAnnual,
    netOperatingIncome,
    debtCoverageRatio,
    debtYieldPct,
    capRateOnCostPct,
    impliedMarketValuation,
    grossRentMultiplier,
    breakEvenOccupancyPct,
    annualNetCashFlow,
    monthlyNetCashFlow,
    cashOnCashReturnPct,
    annualDebtService,
  };
}

// ── 5. Wholesaling Engine ─────────────────────────────────────────────────────

export interface WholesalingInputs {
  contractPurchasePrice: number;
  estimatedARV: number;
  estimatedRehabCost: number;
  targetBuyerMaoMultiplier?: number;
  buyerClosingCostsEstimate?: number;
  targetAssignmentFee?: number;
  isDoubleClosing?: boolean;
  doubleClosingEscrowFees?: number;
}

export interface WholesalingMetrics {
  buyerMaximumAllowableOffer: number;
  recommendedMaxContractOffer: number;
  endBuyerPurchasePrice: number;
  grossAssignmentFee: number;
  netWholesaleProfit: number;
  spreadPctOfContract: number;
  isDealViable: boolean;
}

export function computeWholesalingMetrics(inputs: WholesalingInputs): WholesalingMetrics {
  const contractPrice = Math.max(0, inputs.contractPurchasePrice);
  const arv = Math.max(0, inputs.estimatedARV);
  const rehab = Math.max(0, inputs.estimatedRehabCost);
  const multiplier = Math.max(0, Math.min(1, inputs.targetBuyerMaoMultiplier ?? 0.70));
  const closingEstimate = Math.max(0, inputs.buyerClosingCostsEstimate ?? 0);
  const targetFee = Math.max(0, inputs.targetAssignmentFee ?? 10000);
  const isDouble = Boolean(inputs.isDoubleClosing);
  const doubleFees = Math.max(0, inputs.doubleClosingEscrowFees ?? 2500);

  const buyerMaximumAllowableOffer = Math.max(0, Math.round(arv * multiplier - rehab - closingEstimate));
  const recommendedMaxContractOffer = Math.max(0, buyerMaximumAllowableOffer - targetFee);

  const endBuyerPurchasePrice = contractPrice + targetFee;
  const grossAssignmentFee = targetFee;
  const netWholesaleProfit = isDouble ? Math.max(0, grossAssignmentFee - doubleFees) : grossAssignmentFee;

  const spreadPctOfContract =
    contractPrice > 0 ? Number(((netWholesaleProfit / contractPrice) * 100).toFixed(1)) : 0;
  const isDealViable = contractPrice <= buyerMaximumAllowableOffer && netWholesaleProfit > 0;

  return {
    buyerMaximumAllowableOffer,
    recommendedMaxContractOffer,
    endBuyerPurchasePrice,
    grossAssignmentFee,
    netWholesaleProfit,
    spreadPctOfContract,
    isDealViable,
  };
}

// ── 6. Deal Structuring & Financing Intent Engine ─────────────────────────────

export interface DealStructuringInputs {
  financingModality: 'cash' | 'conventional' | 'hard_money' | 'owner_financing' | 'balloon';
  capitalSeekingIntent: 'solo' | 'partner_down_payment' | 'partner_whole_deal' | 'crowdfund';
  totalCashRequired: number;
  annualNetCashFlow: number;
  partnerEquitySplitPct?: number;
  preferredReturnPct?: number;
  targetCapitalRaise?: number;
  minimumInvestmentTicket?: number;
}

export interface DealStructuringMetrics {
  financingModality: 'cash' | 'conventional' | 'hard_money' | 'owner_financing' | 'balloon';
  capitalSeekingIntent: 'solo' | 'partner_down_payment' | 'partner_whole_deal' | 'crowdfund';
  partnerEquitySplitPct: number;
  partnerCashInvested: number;
  operatorCashInvested: number;
  partnerAnnualCashFlow: number;
  operatorAnnualCashFlow: number;
  partnerCoCReturnPct: number;
  operatorCoCReturnPct: number | null;
  targetCapitalRaise: number;
  minimumInvestmentTicket: number;
}

export function computeDealStructuringMetrics(inputs: DealStructuringInputs): DealStructuringMetrics {
  const modality = inputs.financingModality ?? 'conventional';
  const intent = inputs.capitalSeekingIntent ?? 'solo';
  const totalCash = Math.max(0, inputs.totalCashRequired);
  const annualCashFlow = inputs.annualNetCashFlow;
  const partnerSplitPct = Math.max(0, Math.min(100, inputs.partnerEquitySplitPct ?? 50.0));
  const operatorSplitPct = 100 - partnerSplitPct;

  let partnerCashInvested = 0;
  let operatorCashInvested = totalCash;

  if (intent === 'partner_down_payment') {
    // Partner provides the full down payment / cash requirement for equity split
    partnerCashInvested = totalCash;
    operatorCashInvested = 0;
  } else if (intent === 'partner_whole_deal') {
    // Both contribute according to the equity split
    partnerCashInvested = Math.round(totalCash * (partnerSplitPct / 100));
    operatorCashInvested = totalCash - partnerCashInvested;
  } else if (intent === 'crowdfund') {
    partnerCashInvested = totalCash;
    operatorCashInvested = 0;
  }

  const partnerAnnualCashFlow =
    intent === 'solo' ? 0 : Math.round(annualCashFlow * (partnerSplitPct / 100));
  const operatorAnnualCashFlow =
    intent === 'solo' ? annualCashFlow : Math.round(annualCashFlow * (operatorSplitPct / 100));

  const partnerCoCReturnPct =
    partnerCashInvested > 0 ? Number(((partnerAnnualCashFlow / partnerCashInvested) * 100).toFixed(1)) : 0;
  const operatorCoCReturnPct =
    operatorCashInvested > 0
      ? Number(((operatorAnnualCashFlow / operatorCashInvested) * 100).toFixed(1))
      : null; // null represents infinite return ($0 capital invested)

  const targetCapitalRaise = inputs.targetCapitalRaise ?? totalCash;
  const minimumInvestmentTicket = inputs.minimumInvestmentTicket ?? 10000;

  return {
    financingModality: modality,
    capitalSeekingIntent: intent,
    partnerEquitySplitPct: partnerSplitPct,
    partnerCashInvested,
    operatorCashInvested,
    partnerAnnualCashFlow,
    operatorAnnualCashFlow,
    partnerCoCReturnPct,
    operatorCoCReturnPct,
    targetCapitalRaise,
    minimumInvestmentTicket,
  };
}

// ── 7. Purchase Criteria Screening ("Green Light" Rules Engine) ───────────────

export interface PurchaseCriteriaInputs {
  minCashOnCashPct?: number;
  minDscr?: number;
  minCapRatePct?: number;
  minFlipProfit?: number;
  maxLtvPct?: number;
}

export interface CriterionEvaluation {
  id: string;
  name: string;
  target: string;
  actual: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

export interface PurchaseCriteriaResult {
  overallStatus: 'GREEN_LIGHT' | 'YELLOW_WARNING' | 'RED_LIGHT';
  passedCount: number;
  warningCount: number;
  failedCount: number;
  totalEvaluated: number;
  evaluations: CriterionEvaluation[];
}

export function evaluatePurchaseCriteria(
  criteria: PurchaseCriteriaInputs,
  deal: {
    strategy?: string;
    cashOnCashReturnPct?: number;
    dscr?: number | null;
    capRateOnCost?: number;
    projectedFlipProfit?: number;
    ltvPct?: number;
    isNegativeLeverage?: boolean;
    monthlyNetCashFlow?: number;
  },
): PurchaseCriteriaResult {
  const evaluations: CriterionEvaluation[] = [];

  // 1. Cash-on-Cash Return
  if (deal.strategy !== 'flip' && deal.strategy !== 'wholesale') {
    const minCoC = criteria.minCashOnCashPct ?? 8.0;
    const actualCoC = deal.cashOnCashReturnPct ?? 0;
    if (actualCoC >= minCoC) {
      evaluations.push({
        id: 'coc',
        name: 'Cash-on-Cash Return',
        target: `≥ ${minCoC.toFixed(1)}%`,
        actual: `${actualCoC.toFixed(1)}%`,
        status: 'pass',
        detail: `Achieves target return (${actualCoC.toFixed(1)}% vs min ${minCoC.toFixed(1)}%).`,
      });
    } else if (actualCoC >= minCoC * 0.75) {
      evaluations.push({
        id: 'coc',
        name: 'Cash-on-Cash Return',
        target: `≥ ${minCoC.toFixed(1)}%`,
        actual: `${actualCoC.toFixed(1)}%`,
        status: 'warn',
        detail: `Slightly below target return (${actualCoC.toFixed(1)}% vs min ${minCoC.toFixed(1)}%).`,
      });
    } else {
      evaluations.push({
        id: 'coc',
        name: 'Cash-on-Cash Return',
        target: `≥ ${minCoC.toFixed(1)}%`,
        actual: `${actualCoC.toFixed(1)}%`,
        status: 'fail',
        detail: `Fails target yield hurdle (${actualCoC.toFixed(1)}% vs min ${minCoC.toFixed(1)}%).`,
      });
    }
  }

  // 2. DSCR / Debt Service Coverage Ratio
  if (deal.dscr !== undefined && deal.dscr !== null) {
    const minDscr = criteria.minDscr ?? 1.25;
    const actualDscr = deal.dscr;
    if (actualDscr >= minDscr) {
      evaluations.push({
        id: 'dscr',
        name: 'Debt Coverage Ratio (DSCR)',
        target: `≥ ${minDscr.toFixed(2)}x`,
        actual: `${actualDscr.toFixed(2)}x`,
        status: 'pass',
        detail: `Comfortably exceeds lender threshold (${actualDscr.toFixed(2)}x vs min ${minDscr.toFixed(2)}x).`,
      });
    } else if (actualDscr >= 1.0) {
      evaluations.push({
        id: 'dscr',
        name: 'Debt Coverage Ratio (DSCR)',
        target: `≥ ${minDscr.toFixed(2)}x`,
        actual: `${actualDscr.toFixed(2)}x`,
        status: 'warn',
        detail: `Meets break-even but below standard commercial floor (${actualDscr.toFixed(2)}x vs min ${minDscr.toFixed(2)}x).`,
      });
    } else {
      evaluations.push({
        id: 'dscr',
        name: 'Debt Coverage Ratio (DSCR)',
        target: `≥ ${minDscr.toFixed(2)}x`,
        actual: `${actualDscr.toFixed(2)}x`,
        status: 'fail',
        detail: `Negative cash debt service coverage (${actualDscr.toFixed(2)}x < 1.00x).`,
      });
    }
  }

  // 3. Cap Rate on Cost
  if (deal.capRateOnCost !== undefined) {
    const minCap = criteria.minCapRatePct ?? 6.0;
    const actualCap = deal.capRateOnCost;
    if (actualCap >= minCap) {
      evaluations.push({
        id: 'cap_rate',
        name: 'Cap Rate on Cost',
        target: `≥ ${minCap.toFixed(1)}%`,
        actual: `${actualCap.toFixed(1)}%`,
        status: 'pass',
        detail: `Institutional yield on cost met (${actualCap.toFixed(1)}% vs min ${minCap.toFixed(1)}%).`,
      });
    } else {
      evaluations.push({
        id: 'cap_rate',
        name: 'Cap Rate on Cost',
        target: `≥ ${minCap.toFixed(1)}%`,
        actual: `${actualCap.toFixed(1)}%`,
        status: actualCap >= minCap * 0.8 ? 'warn' : 'fail',
        detail: `Below target cap rate (${actualCap.toFixed(1)}% vs min ${minCap.toFixed(1)}%).`,
      });
    }
  }

  // 4. Flip Profit (For Fix & Flip)
  if (deal.strategy === 'flip' && deal.projectedFlipProfit !== undefined) {
    const minProfit = criteria.minFlipProfit ?? 30000;
    const actualProfit = deal.projectedFlipProfit;
    if (actualProfit >= minProfit) {
      evaluations.push({
        id: 'flip_profit',
        name: 'Projected Net Flip Profit',
        target: `≥ $${minProfit.toLocaleString()}`,
        actual: `$${actualProfit.toLocaleString()}`,
        status: 'pass',
        detail: `Exceeds minimum profit threshold (+$${actualProfit.toLocaleString()}).`,
      });
    } else if (actualProfit > 0) {
      evaluations.push({
        id: 'flip_profit',
        name: 'Projected Net Flip Profit',
        target: `≥ $${minProfit.toLocaleString()}`,
        actual: `$${actualProfit.toLocaleString()}`,
        status: 'warn',
        detail: `Profitable but thin margin buffer ($${actualProfit.toLocaleString()} vs target $${minProfit.toLocaleString()}).`,
      });
    } else {
      evaluations.push({
        id: 'flip_profit',
        name: 'Projected Net Flip Profit',
        target: `≥ $${minProfit.toLocaleString()}`,
        actual: `$${actualProfit.toLocaleString()}`,
        status: 'fail',
        detail: `Projected loss on resale.`,
      });
    }
  }

  // 5. Negative Leverage Check
  if (deal.isNegativeLeverage) {
    evaluations.push({
      id: 'negative_leverage',
      name: 'Leverage Direction',
      target: 'Positive Leverage',
      actual: 'Negative Leverage',
      status: 'fail',
      detail: 'Debt constant exceeds yield on cost, compressing equity cash returns.',
    });
  } else {
    evaluations.push({
      id: 'negative_leverage',
      name: 'Leverage Direction',
      target: 'Positive Leverage',
      actual: 'Positive Leverage',
      status: 'pass',
      detail: 'Debt is accretive to equity returns.',
    });
  }

  const passedCount = evaluations.filter((e) => e.status === 'pass').length;
  const warningCount = evaluations.filter((e) => e.status === 'warn').length;
  const failedCount = evaluations.filter((e) => e.status === 'fail').length;

  let overallStatus: 'GREEN_LIGHT' | 'YELLOW_WARNING' | 'RED_LIGHT' = 'GREEN_LIGHT';
  if (failedCount > 0) {
    overallStatus = 'RED_LIGHT';
  } else if (warningCount > 0) {
    overallStatus = 'YELLOW_WARNING';
  }

  return {
    overallStatus,
    passedCount,
    warningCount,
    failedCount,
    totalEvaluated: evaluations.length,
    evaluations,
  };
}
