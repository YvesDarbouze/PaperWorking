/**
 * Deal Analyzer Calculation Engine
 * PaperWorking (paperworking.co)
 *
 * Canonical financial calculation engine for real estate investment analysis.
 * Implements exact specs for Rental (Buy & Hold), Fix & Flip, and BRRRR strategies.
 */

// ── Types & Interfaces ────────────────────────────────────────────────────────

export interface RentalDealInputs {
  purchasePrice: number;
  monthlyRent: number;
  otherMonthlyIncome?: number;
  vacancyRate?: number;            // % default 5
  propertyTaxesAnnual?: number;    // $
  insuranceAnnual?: number;        // $
  utilitiesMonthly?: number;       // $ default 0
  hoaMonthly?: number;             // $ default 0
  repairsPercent?: number;         // % default 5
  capexPercent?: number;           // % default 5
  propertyMgmtPercent?: number;    // % default 10
  downPaymentPercent?: number;     // % default 25
  interestRate?: number;           // % default 6.5
  loanTermYears?: number;          // years default 30
  closingCostsPercent?: number;    // % default 3
  upfrontRehabCost?: number;       // $ default 0
  isCashPurchase?: boolean;
  quickExpenseMode?: boolean;      // 50% rule mode
  rentGrowthAnnualPercent?: number;
  expenseGrowthAnnualPercent?: number;
  appreciationAnnualPercent?: number;
  sellingCostsPercent?: number;
  holdPeriodYears?: number;
}

export interface RentalDealResults {
  grossAnnualRent: number;
  vacancyLossAnnual: number;
  otherIncomeAnnual: number;
  egi: number;                      // Effective Gross Income
  operatingExpensesAnnual: number;
  noi: number;                      // Net Operating Income
  purchaseClosingCosts: number;
  downPayment: number;
  loanAmount: number;
  monthlyPI: number;                // Monthly Principal & Interest
  annualDebtService: number;
  annualCashFlow: number;
  monthlyCashFlow: number;
  totalCashInvested: number;
  cashOnCashReturn: number;         // % (Infinity if cashInvested <= 0 & cashFlow > 0)
  capRate: number;                  // % (on purchase price)
  proFormaCapRate: number;          // % (on total acquisition cost incl. rehab)
  grm: number;                      // Gross Rent Multiplier
  grossRentMultiplier: number;       // alias
  dscrCommercial: number;           // NOI / Debt Service
  dscrCommercialLabel: string;
  dscrResidential: number;          // Effective Monthly Rent / Monthly PITIA
  dscrResidentialLabel: string;
  breakEvenOccupancy: number;       // %
  rentToPriceMonthly: number;       // % (monthlyRent / purchasePrice)
  rentToPriceMonthlyLabel: string;
  priceToRentAnnual: number;        // purchasePrice / annualRent
  priceToRentAnnualLabel: string;
  upfrontRehabCost: number;
  isCashPurchase: boolean;
  proFormaSchedule: (ProFormaYearResult & { profitIfSoldThatYear: number; annualizedReturnPercent: number })[];
}

export interface FlipDealInputs {
  purchasePrice: number;
  arv: number;
  rehabBudget: number;
  holdPeriodMonths?: number;          // default 6
  holdingMonths?: number;             // alias
  hardMoneyLTC?: number;              // % default 85
  hardMoneyLTCPercent?: number;       // alias
  hardMoneyInterestRate?: number;    // % default 11.5
  hardMoneyRate?: number;            // alias
  hardMoneyPoints?: number;          // % default 2
  hardMoneyPointsPercent?: number;   // alias
  buyClosingCostsPercent?: number;    // % default 2
  purchaseClosingCostsPercent?: number; // alias
  sellingCostsPercent?: number;       // % default 8
  monthlyHoldingCosts?: number;       // $ default stack total
  monthlyHoldingStack?: number;       // alias
  maoTargetPct?: number;              // default 0.70 (70% rule)
  desiredProfitOverride?: number;     // $ optional for bottom-up MAO
  desiredProfit?: number;             // alias
  isCashPurchase?: boolean;
}

export interface FlipDealResults {
  totalAcquisitionAndRehab: number;
  hardMoneyLoanAmount: number;
  ltarv: number;                      // % (Loan / ARV)
  isLTARVBreached: boolean;           // true if LTARV > 70%
  financingPointsCost: number;
  financingInterestCost: number;
  interestCost: number;               // alias
  totalFinancingCosts: number;
  buyClosingCosts: number;
  holdingCostsTotal: number;
  sellingCosts: number;
  totalProjectCost: number;
  profit: number;
  flipProfit: number;                 // alias
  downPayment: number;
  totalCashInvested: number;          // Upfront out-of-pocket
  roi: number;                        // % (profit / totalCashInvested)
  flipROI: number;                    // alias
  profitMargin: number;               // % (profit / ARV)
  mao70: number;                      // (ARV * maoTargetPct) - rehab
  flipMAO70: number;                  // alias
  bottomUpMaxPurchasePrice: number;
  desiredProfit: number;
  isOverMAO: boolean;
  verdict: 'PASS' | 'FAIL';
}

export interface BRRRRDealInputs {
  purchasePrice: number;
  rehabBudget: number;
  arv: number;
  monthlyRentPostRehab?: number;
  postRefiMonthlyRent?: number;       // alias
  bridgeLTC?: number;                 // % default 85
  bridgeInterestRate?: number;       // % default 11.5
  bridgePoints?: number;             // % default 2
  holdPeriodMonths?: number;         // default 6
  preRefiHoldMonths?: number;        // alias
  monthlyHoldingCosts?: number;      // $ default 475
  buyClosingCostsPercent?: number;   // % default 2
  purchaseClosingCostsPercent?: number; // alias
  refiLTV?: number;                  // % default 75
  refiLTVPercent?: number;           // alias
  refiInterestRate?: number;         // % default 8.5
  refiLoanTermYears?: number;        // years default 30
  refiTermYears?: number;            // alias
  refiClosingCostsPercent?: number;  // % default 2
  vacancyRate?: number;              // % default 5
  propertyTaxesAnnual?: number;      // $ default 1800
  insuranceAnnual?: number;          // $ default 1200
  utilitiesMonthly?: number;         // $ default 0 post-rehab
  hoaMonthly?: number;               // $ default 0
  repairsPercent?: number;           // % default 5
  capexPercent?: number;             // % default 5
  propertyMgmtPercent?: number;      // % default 10
  rentGrowthAnnualPercent?: number;
  expenseGrowthAnnualPercent?: number;
  appreciationAnnualPercent?: number;
  sellingCostsPercent?: number;
}

export interface BRRRRDealResults {
  totalAcquisitionAndRehab: number;
  bridgeLoanAmount: number;
  bridgePointsCost: number;
  bridgeInterestCost: number;
  totalBridgeFinancingCosts: number;
  buyClosingCosts: number;
  holdingCostsTotal: number;
  initialCashInvested: number;
  newRefiLoanAmount: number;
  refiClosingCosts: number;
  bridgePayoff: number;
  cashOut: number;                    // newRefiLoanAmount - bridgePayoff - refiClosingCosts
  cashLeftInDeal: number;             // initialCashInvested - cashOut
  postRefiGrossAnnualRent: number;
  postRefiEGI: number;
  postRefiOpEx: number;
  postRefiNOI: number;
  postRefiMonthlyPI: number;
  postRefiAnnualDebtService: number;
  postRefiAnnualCashFlow: number;
  postRefiMonthlyCashFlow: number;
  postRefiCoC: number;                // % (Infinity if cashLeftInDeal <= 0 & cashFlow > 0)
  postRefiCoCDisplay: string;
  costBasis: number;                  // purchase + rehab + buyClosing + bridgeFinancing + holding
  costBasisPctARV: number;            // % (costBasis / ARV)
  costBasisPercentOfARV: number;      // alias
  postRefiDSCR: number;
}

export interface AmortizationPeriod {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

export interface AmortizationResult {
  monthlyPayment: number;
  annualDebtService: number;
  firstYearInterest: number;
  firstYearPrincipal: number;
  totalInterestPaid: number;
  schedule: AmortizationPeriod[];
}

export interface ProFormaInputs {
  purchasePrice: number;
  arv?: number;
  initialGrossAnnualRent: number;
  initialAnnualOpEx: number;
  initialAnnualDebtService: number;
  initialCashInvested: number;
  loanAmount: number;
  interestRate: number;
  loanTermYears: number;
  rentGrowthPercent?: number;        // default 3%
  expenseGrowthPercent?: number;     // default 2%
  appreciationPercent?: number;      // default 3%
  sellingCostsPercent?: number;      // default 6%
  holdYears?: number;                // default 10
}

export interface ProFormaYearResult {
  year: number;
  grossRent: number;
  operatingExpenses: number;
  noi: number;
  debtService: number;
  cashFlow: number;
  cumulativeCashFlow: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;                     // propertyValue - loanBalance
  sellingCosts: number;
  netExitProceeds: number;
  profitIfSold: number;               // cumulativeCashFlow + netExitProceeds - initialCashInvested
}

// ── 1. RENTAL DEAL CALCULATOR ──────────────────────────────────────────────────

export function calculateRentalDeal(inputs: RentalDealInputs): RentalDealResults {
  const purchasePrice = Number(inputs.purchasePrice || 0);
  const monthlyRent = Number(inputs.monthlyRent || 0);
  const otherMonthlyIncome = Number(inputs.otherMonthlyIncome || 0);
  const vacancyRate = Number(inputs.vacancyRate ?? 5);
  const propertyTaxesAnnual = Number(inputs.propertyTaxesAnnual ?? (purchasePrice * 0.012));
  const insuranceAnnual = Number(inputs.insuranceAnnual ?? (purchasePrice * 0.005));
  const utilitiesMonthly = Number(inputs.utilitiesMonthly ?? 0);
  const hoaMonthly = Number(inputs.hoaMonthly ?? 0);
  const repairsPercent = Number(inputs.repairsPercent ?? 5);
  const capexPercent = Number(inputs.capexPercent ?? 5);
  const propertyMgmtPercent = Number(inputs.propertyMgmtPercent ?? 10);
  const downPaymentPercent = Number(inputs.downPaymentPercent ?? 25);
  const interestRate = Number(inputs.interestRate ?? 6.5);
  const loanTermYears = Number(inputs.loanTermYears ?? 30);
  const closingCostsPercent = Number(inputs.closingCostsPercent ?? 3);
  const upfrontRehabCost = Number(inputs.upfrontRehabCost ?? 0);
  const isCashPurchase = !!inputs.isCashPurchase;
  const quickExpenseMode = !!inputs.quickExpenseMode;

  const grossAnnualRent = monthlyRent * 12;
  const otherIncomeAnnual = otherMonthlyIncome * 12;
  const vacancyLossAnnual = grossAnnualRent * (vacancyRate / 100);
  const egi = (grossAnnualRent - vacancyLossAnnual) + otherIncomeAnnual;

  let operatingExpensesAnnual = 0;
  if (quickExpenseMode) {
    // 50% Rule: Operating Expenses ≈ 50% of gross rent, including management
    operatingExpensesAnnual = grossAnnualRent * 0.50;
  } else {
    const taxes = propertyTaxesAnnual;
    const insurance = insuranceAnnual;
    const utilities = utilitiesMonthly * 12;
    const hoa = hoaMonthly * 12;
    const repairs = grossAnnualRent * (repairsPercent / 100);
    const capex = grossAnnualRent * (capexPercent / 100);
    const mgmt = egi * (propertyMgmtPercent / 100);
    operatingExpensesAnnual = taxes + insurance + utilities + hoa + repairs + capex + mgmt;
  }

  const noi = egi - operatingExpensesAnnual;

  const purchaseClosingCosts = purchasePrice * (closingCostsPercent / 100);
  const downPayment = isCashPurchase ? purchasePrice : purchasePrice * (downPaymentPercent / 100);
  const loanAmount = isCashPurchase ? 0 : Math.max(0, purchasePrice - downPayment);

  let monthlyPI = 0;
  if (loanAmount > 0 && !isCashPurchase) {
    const r = (interestRate / 100) / 12;
    const n = loanTermYears * 12;
    if (r > 0) {
      const pow = Math.pow(1 + r, n);
      monthlyPI = (loanAmount * r * pow) / (pow - 1);
    } else {
      monthlyPI = loanAmount / n;
    }
  }

  const annualDebtService = monthlyPI * 12;
  const annualCashFlow = noi - annualDebtService;
  const monthlyCashFlow = annualCashFlow / 12;

  const totalCashInvested = downPayment + purchaseClosingCosts + upfrontRehabCost;

  let cashOnCashReturn = 0;
  if (totalCashInvested <= 0) {
    cashOnCashReturn = annualCashFlow > 0 ? Infinity : 0;
  } else {
    cashOnCashReturn = (annualCashFlow / totalCashInvested) * 100;
  }

  const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;
  const totalAcquisitionCost = purchasePrice + upfrontRehabCost;
  const proFormaCapRate = totalAcquisitionCost > 0 ? (noi / totalAcquisitionCost) * 100 : capRate;
  const grm = grossAnnualRent > 0 ? purchasePrice / grossAnnualRent : 0;

  // Commercial DSCR: NOI / Annual Debt Service (Lender minimum 1.25)
  const dscrCommercial = annualDebtService > 0 ? noi / annualDebtService : (noi > 0 ? Infinity : 0);

  // Residential DSCR: Effective Monthly Rent / Monthly PITIA (Floor 1.0)
  const effectiveMonthlyRent = egi / 12;
  const monthlyPITIA = monthlyPI + (propertyTaxesAnnual / 12) + (insuranceAnnual / 12) + hoaMonthly;
  const dscrResidential = monthlyPITIA > 0 ? effectiveMonthlyRent / monthlyPITIA : (effectiveMonthlyRent > 0 ? Infinity : 0);

  const grossPotentialIncome = grossAnnualRent + otherIncomeAnnual;
  const breakEvenOccupancy = grossPotentialIncome > 0 ? ((operatingExpensesAnnual + annualDebtService) / grossPotentialIncome) * 100 : 0;

  const rentToPriceMonthly = purchasePrice > 0 ? (monthlyRent / purchasePrice) * 100 : 0;
  const priceToRentAnnual = grossAnnualRent > 0 ? purchasePrice / grossAnnualRent : 0;

  const proFormaRaw = calculateProFormaProjections({
    purchasePrice,
    arv: purchasePrice,
    initialGrossAnnualRent: grossAnnualRent,
    initialAnnualOpEx: operatingExpensesAnnual,
    initialAnnualDebtService: annualDebtService,
    initialCashInvested: totalCashInvested,
    loanAmount,
    interestRate,
    loanTermYears,
    rentGrowthPercent: Number(inputs.rentGrowthAnnualPercent ?? 3.0),
    expenseGrowthPercent: Number(inputs.expenseGrowthAnnualPercent ?? 2.5),
    appreciationPercent: Number(inputs.appreciationAnnualPercent ?? 4.0),
    sellingCostsPercent: Number(inputs.sellingCostsPercent ?? 6.0),
    holdYears: Number(inputs.holdPeriodYears ?? 30),
  });

  const proFormaSchedule = proFormaRaw.map((row) => ({
    ...row,
    profitIfSoldThatYear: row.profitIfSold,
    annualizedReturnPercent: totalCashInvested > 0 ? (row.profitIfSold / totalCashInvested) * 100 : 0,
  }));

  return {
    grossAnnualRent,
    vacancyLossAnnual,
    otherIncomeAnnual,
    egi,
    operatingExpensesAnnual,
    noi,
    purchaseClosingCosts,
    downPayment,
    loanAmount,
    monthlyPI,
    annualDebtService,
    annualCashFlow,
    monthlyCashFlow,
    totalCashInvested,
    cashOnCashReturn,
    capRate,
    proFormaCapRate,
    grm,
    grossRentMultiplier: grm,
    dscrCommercial,
    dscrCommercialLabel: 'DSCR (NOI ÷ debt service)',
    dscrResidential,
    dscrResidentialLabel: 'DSCR (rent ÷ PITIA)',
    breakEvenOccupancy,
    rentToPriceMonthly,
    rentToPriceMonthlyLabel: 'Rent-to-price (monthly)',
    priceToRentAnnual,
    priceToRentAnnualLabel: 'Price-to-rent (annual)',
    upfrontRehabCost,
    isCashPurchase,
    proFormaSchedule,
  };
}

// ── 2. FLIP DEAL CALCULATOR ────────────────────────────────────────────────────

export function calculateFlipDeal(inputs: FlipDealInputs): FlipDealResults {
  const purchasePrice = Number(inputs.purchasePrice || 0);
  const arv = Number(inputs.arv || 0);
  const rehabBudget = Number(inputs.rehabBudget || 0);
  const holdPeriodMonths = Number(inputs.holdPeriodMonths ?? inputs.holdingMonths ?? 6);
  const hardMoneyLTC = Number(inputs.hardMoneyLTC ?? inputs.hardMoneyLTCPercent ?? 85);
  const hardMoneyInterestRate = Number(inputs.hardMoneyInterestRate ?? inputs.hardMoneyRate ?? 11.5);
  const hardMoneyPoints = Number(inputs.hardMoneyPoints ?? inputs.hardMoneyPointsPercent ?? 2);
  const buyClosingCostsPercent = Number(inputs.buyClosingCostsPercent ?? inputs.purchaseClosingCostsPercent ?? 2);
  const sellingCostsPercent = Number(inputs.sellingCostsPercent ?? 8);
  const monthlyHoldingCosts = Number(inputs.monthlyHoldingCosts ?? inputs.monthlyHoldingStack ?? 475);
  const maoTargetPct = Number(inputs.maoTargetPct ?? 0.70);
  const isCashPurchase = !!inputs.isCashPurchase;

  const totalAcquisitionAndRehab = purchasePrice + rehabBudget;
  const hardMoneyLoanAmount = isCashPurchase ? 0 : totalAcquisitionAndRehab * (hardMoneyLTC / 100);

  const ltarv = arv > 0 ? (hardMoneyLoanAmount / arv) * 100 : 0;
  const isLTARVBreached = ltarv > 70;

  const financingPointsCost = hardMoneyLoanAmount * (hardMoneyPoints / 100);
  const financingInterestCost = hardMoneyLoanAmount * (hardMoneyInterestRate / 100) * (holdPeriodMonths / 12);
  const totalFinancingCosts = financingPointsCost + financingInterestCost;

  const buyClosingCosts = purchasePrice * (buyClosingCostsPercent / 100);
  const holdingCostsTotal = monthlyHoldingCosts * holdPeriodMonths;
  const sellingCosts = arv * (sellingCostsPercent / 100);

  const totalProjectCost = purchasePrice + buyClosingCosts + rehabBudget + holdingCostsTotal + totalFinancingCosts + sellingCosts;
  const profit = arv - totalProjectCost;

  const downPayment = totalAcquisitionAndRehab - hardMoneyLoanAmount;
  const totalCashInvested = downPayment + buyClosingCosts + totalFinancingCosts + holdingCostsTotal;

  const roi = totalCashInvested > 0 ? (profit / totalCashInvested) * 100 : 0;

  // MAO (70% Rule) = (ARV * maoTargetPct) - rehab
  const mao70 = (arv * maoTargetPct) - rehabBudget;

  const desiredProfit = inputs.desiredProfitOverride ?? (arv * 0.15);
  const bottomUpMaxPurchasePrice = arv - rehabBudget - buyClosingCosts - holdingCostsTotal - totalFinancingCosts - sellingCosts - desiredProfit;

  const isOverMAO = purchasePrice > mao70;
  const verdict: 'PASS' | 'FAIL' = (isOverMAO || profit <= 0 || isLTARVBreached) ? 'FAIL' : 'PASS';

  const profitMargin = arv > 0 ? (profit / arv) * 100 : 0;

  return {
    totalAcquisitionAndRehab,
    hardMoneyLoanAmount,
    ltarv,
    isLTARVBreached,
    financingPointsCost,
    financingInterestCost,
    interestCost: financingInterestCost,
    totalFinancingCosts,
    buyClosingCosts,
    holdingCostsTotal,
    sellingCosts,
    totalProjectCost,
    profit,
    flipProfit: profit,
    downPayment,
    totalCashInvested,
    roi,
    flipROI: roi,
    profitMargin,
    mao70,
    flipMAO70: mao70,
    bottomUpMaxPurchasePrice,
    desiredProfit,
    isOverMAO,
    verdict,
  };
}

// ── 3. BRRRR DEAL CALCULATOR ───────────────────────────────────────────────────

export function calculateBRRRRDeal(inputs: BRRRRDealInputs): BRRRRDealResults {
  const purchasePrice = Number(inputs.purchasePrice || 0);
  const rehabBudget = Number(inputs.rehabBudget || 0);
  const arv = Number(inputs.arv || 0);
  const monthlyRentPostRehab = Number(inputs.monthlyRentPostRehab ?? inputs.postRefiMonthlyRent ?? 0);
  const bridgeLTC = Number(inputs.bridgeLTC ?? 85);
  const bridgeInterestRate = Number(inputs.bridgeInterestRate ?? 11.5);
  const bridgePoints = Number(inputs.bridgePoints ?? 2);
  const holdPeriodMonths = Number(inputs.holdPeriodMonths ?? inputs.preRefiHoldMonths ?? 6);
  const monthlyHoldingCosts = Number(inputs.monthlyHoldingCosts ?? 475);
  const buyClosingCostsPercent = Number(inputs.buyClosingCostsPercent ?? inputs.purchaseClosingCostsPercent ?? 2);
  const refiLTV = Number(inputs.refiLTV ?? inputs.refiLTVPercent ?? 75);
  const refiInterestRate = Number(inputs.refiInterestRate ?? 8.5);
  const refiTermYears = Number(inputs.refiTermYears ?? inputs.refiLoanTermYears ?? 30);
  const refiClosingCostsPercent = Number(inputs.refiClosingCostsPercent ?? 2);
  const vacancyRate = Number(inputs.vacancyRate ?? 5);
  const propertyTaxesAnnual = Number(inputs.propertyTaxesAnnual ?? 1800);
  const insuranceAnnual = Number(inputs.insuranceAnnual ?? 1200);
  const utilitiesMonthly = Number(inputs.utilitiesMonthly ?? 0);
  const hoaMonthly = Number(inputs.hoaMonthly ?? 0);
  const repairsPercent = Number(inputs.repairsPercent ?? 5);
  const capexPercent = Number(inputs.capexPercent ?? 5);
  const propertyMgmtPercent = Number(inputs.propertyMgmtPercent ?? 10);

  const totalAcquisitionAndRehab = purchasePrice + rehabBudget;
  const bridgeLoanAmount = totalAcquisitionAndRehab * (bridgeLTC / 100);
  const bridgePointsCost = bridgeLoanAmount * (bridgePoints / 100);
  const bridgeInterestCost = bridgeLoanAmount * (bridgeInterestRate / 100) * (holdPeriodMonths / 12);
  const totalBridgeFinancingCosts = bridgePointsCost + bridgeInterestCost;

  const buyClosingCosts = purchasePrice * (buyClosingCostsPercent / 100);
  const holdingCostsTotal = monthlyHoldingCosts * holdPeriodMonths;

  const initialCashInvested = (totalAcquisitionAndRehab - bridgeLoanAmount) + buyClosingCosts + totalBridgeFinancingCosts + holdingCostsTotal;

  const newRefiLoanAmount = arv * (refiLTV / 100);
  const refiClosingCosts = newRefiLoanAmount * (refiClosingCostsPercent / 100);
  const bridgePayoff = bridgeLoanAmount;

  const cashOut = newRefiLoanAmount - bridgePayoff - refiClosingCosts;
  const cashLeftInDeal = initialCashInvested - cashOut;

  // Post-Refi Operations
  const postRefiGrossAnnualRent = monthlyRentPostRehab * 12;
  const vacancyLoss = postRefiGrossAnnualRent * (vacancyRate / 100);
  const postRefiEGI = postRefiGrossAnnualRent - vacancyLoss;

  const taxes = propertyTaxesAnnual;
  const insurance = insuranceAnnual;
  const utilities = utilitiesMonthly * 12;
  const hoa = hoaMonthly * 12;
  const repairs = postRefiGrossAnnualRent * (repairsPercent / 100);
  const capex = postRefiGrossAnnualRent * (capexPercent / 100);
  const mgmt = postRefiEGI * (propertyMgmtPercent / 100);
  const postRefiOpEx = taxes + insurance + utilities + hoa + repairs + capex + mgmt;

  const postRefiNOI = postRefiEGI - postRefiOpEx;

  let postRefiMonthlyPI = 0;
  if (newRefiLoanAmount > 0) {
    const r = (refiInterestRate / 100) / 12;
    const n = refiTermYears * 12;
    if (r > 0) {
      const pow = Math.pow(1 + r, n);
      postRefiMonthlyPI = (newRefiLoanAmount * r * pow) / (pow - 1);
    } else {
      postRefiMonthlyPI = newRefiLoanAmount / n;
    }
  }

  const postRefiAnnualDebtService = postRefiMonthlyPI * 12;
  const postRefiAnnualCashFlow = postRefiNOI - postRefiAnnualDebtService;
  const postRefiMonthlyCashFlow = postRefiAnnualCashFlow / 12;

  let postRefiCoC = 0;
  if (cashLeftInDeal <= 0) {
    postRefiCoC = postRefiAnnualCashFlow > 0 ? Infinity : 0;
  } else {
    postRefiCoC = (postRefiAnnualCashFlow / cashLeftInDeal) * 100;
  }

  const costBasis = purchasePrice + rehabBudget + buyClosingCosts + totalBridgeFinancingCosts + holdingCostsTotal;
  const costBasisPctARV = arv > 0 ? (costBasis / arv) * 100 : 0;

  const postRefiDSCR = postRefiAnnualDebtService > 0 ? postRefiNOI / postRefiAnnualDebtService : (postRefiNOI > 0 ? Infinity : 0);
  const postRefiCoCDisplay = cashLeftInDeal <= 0 && postRefiAnnualCashFlow > 0 ? '∞ / all capital returned' : `${postRefiCoC.toFixed(2)}%`;

  return {
    totalAcquisitionAndRehab,
    bridgeLoanAmount,
    bridgePointsCost,
    bridgeInterestCost,
    totalBridgeFinancingCosts,
    buyClosingCosts,
    holdingCostsTotal,
    initialCashInvested,
    newRefiLoanAmount,
    refiClosingCosts,
    bridgePayoff,
    cashOut,
    cashLeftInDeal,
    postRefiGrossAnnualRent,
    postRefiEGI,
    postRefiOpEx,
    postRefiNOI,
    postRefiMonthlyPI,
    postRefiAnnualDebtService,
    postRefiAnnualCashFlow,
    postRefiMonthlyCashFlow,
    postRefiCoC,
    postRefiCoCDisplay,
    costBasis,
    costBasisPctARV,
    costBasisPercentOfARV: costBasisPctARV,
    postRefiDSCR,
  };
}

// ── 4. AMORTIZATION SCHEDULE CALCULATOR ────────────────────────────────────────

export function calculateAmortizationSchedule(
  loanAmount: number,
  annualInterestRatePercent: number,
  loanTermMonths: number,
  interestOnly: boolean = false
): AmortizationResult {
  const schedule: AmortizationPeriod[] = [];
  if (loanAmount <= 0 || loanTermMonths <= 0) {
    return {
      monthlyPayment: 0,
      annualDebtService: 0,
      firstYearInterest: 0,
      firstYearPrincipal: 0,
      totalInterestPaid: 0,
      schedule,
    };
  }

  const monthlyRate = (annualInterestRatePercent / 100) / 12;
  let monthlyPayment = 0;

  if (interestOnly) {
    monthlyPayment = loanAmount * monthlyRate;
    let firstYearInterest = 0;
    let totalInterestPaid = 0;

    for (let m = 1; m <= loanTermMonths; m++) {
      const interest = loanAmount * monthlyRate;
      totalInterestPaid += interest;
      if (m <= 12) firstYearInterest += interest;

      schedule.push({
        month: m,
        payment: monthlyPayment,
        principal: 0,
        interest,
        remainingBalance: loanAmount,
      });
    }

    return {
      monthlyPayment,
      annualDebtService: monthlyPayment * 12,
      firstYearInterest,
      firstYearPrincipal: 0,
      totalInterestPaid,
      schedule,
    };
  }

  if (monthlyRate > 0) {
    const pow = Math.pow(1 + monthlyRate, loanTermMonths);
    monthlyPayment = (loanAmount * monthlyRate * pow) / (pow - 1);
  } else {
    monthlyPayment = loanAmount / loanTermMonths;
  }

  let remainingBalance = loanAmount;
  let firstYearInterest = 0;
  let firstYearPrincipal = 0;
  let totalInterestPaid = 0;

  for (let m = 1; m <= loanTermMonths; m++) {
    const interest = remainingBalance * monthlyRate;
    const principal = monthlyPayment - interest;
    remainingBalance = Math.max(0, remainingBalance - principal);
    totalInterestPaid += interest;

    if (m <= 12) {
      firstYearInterest += interest;
      firstYearPrincipal += principal;
    }

    schedule.push({
      month: m,
      payment: monthlyPayment,
      principal,
      interest,
      remainingBalance,
    });
  }

  return {
    monthlyPayment,
    annualDebtService: monthlyPayment * 12,
    firstYearInterest,
    firstYearPrincipal,
    totalInterestPaid,
    schedule,
  };
}

// ── 5. IRR & EQUITY MULTIPLE CALCULATORS ───────────────────────────────────────

/**
 * Internal Rate of Return (IRR) — Newton-Raphson Solver.
 * Solves rate r where sum( cashFlows[t] / (1+r)^t ) = 0.
 * Returns null on non-convergence or invalid inputs, never NaN.
 */
export function calculateIRR(cashFlows: number[], guess: number = 0.1): number | null {
  if (!Array.isArray(cashFlows) || cashFlows.length < 2) return null;
  
  const hasNegative = cashFlows.some((cf) => cf < 0);
  const hasPositive = cashFlows.some((cf) => cf > 0);
  if (!hasNegative || !hasPositive) return null;

  let rate = guess;
  const maxIterations = 100;
  const tolerance = 1e-7;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dNpv = 0;

    for (let t = 0; t < cashFlows.length; t++) {
      const denom = Math.pow(1 + rate, t);
      if (denom === 0 || !isFinite(denom)) return null;
      
      npv += cashFlows[t] / denom;
      dNpv -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
    }

    if (Math.abs(dNpv) < 1e-12) return null;

    const nextRate = rate - npv / dNpv;
    if (!isFinite(nextRate)) return null;

    if (Math.abs(nextRate - rate) < tolerance) {
      return nextRate * 100; // return percentage e.g. 15.4%
    }

    rate = nextRate;
  }

  return null;
}

/**
 * Equity Multiple = (Total Distributions + Final Equity) / Total Equity Invested
 */
export function calculateEquityMultiple(
  totalDistributions: number,
  finalEquity: number,
  totalEquityInvested: number
): number {
  if (totalEquityInvested <= 0) return 0;
  return (totalDistributions + finalEquity) / totalEquityInvested;
}

// ── 6. PRO FORMA PROJECTIONS ENGINE ────────────────────────────────────────────

export function calculateProFormaProjections(inputs: ProFormaInputs): ProFormaYearResult[] {
  const {
    purchasePrice,
    arv,
    initialGrossAnnualRent,
    initialAnnualOpEx,
    initialAnnualDebtService,
    initialCashInvested,
    loanAmount,
    interestRate,
    loanTermYears,
    rentGrowthPercent = 3,
    expenseGrowthPercent = 2,
    appreciationPercent = 3,
    sellingCostsPercent = 6,
    holdYears = 10,
  } = inputs;

  const results: ProFormaYearResult[] = [];
  const baseValue = arv && arv > 0 ? arv : purchasePrice;

  // Generate full loan amortization schedule
  const amort = calculateAmortizationSchedule(loanAmount, interestRate, loanTermYears * 12);

  let cumulativeCashFlow = 0;
  let currentRent = initialGrossAnnualRent;
  let currentOpEx = initialAnnualOpEx;
  let currentValue = baseValue;

  for (let year = 1; year <= holdYears; year++) {
    if (year > 1) {
      currentRent *= (1 + rentGrowthPercent / 100);
      currentOpEx *= (1 + expenseGrowthPercent / 100);
      currentValue *= (1 + appreciationPercent / 100);
    }

    const noi = currentRent - currentOpEx;
    const debtService = initialAnnualDebtService;
    const cashFlow = noi - debtService;
    cumulativeCashFlow += cashFlow;

    // Remaining loan balance at end of Year N (month = year * 12)
    const monthIdx = Math.min(year * 12 - 1, amort.schedule.length - 1);
    const loanBalance = monthIdx >= 0 ? amort.schedule[monthIdx].remainingBalance : 0;

    const sellingCosts = currentValue * (sellingCostsPercent / 100);
    const netExitProceeds = Math.max(0, currentValue - sellingCosts - loanBalance);

    // Profit if sold in Year N uses Year N cumulative cash flow + Year N net exit proceeds - initial cash invested
    const profitIfSold = cumulativeCashFlow + netExitProceeds - initialCashInvested;

    results.push({
      year,
      grossRent: currentRent,
      operatingExpenses: currentOpEx,
      noi,
      debtService,
      cashFlow,
      cumulativeCashFlow,
      propertyValue: currentValue,
      loanBalance,
      equity: currentValue - loanBalance,
      sellingCosts,
      netExitProceeds,
      profitIfSold,
    });
  }

  return results;
}
