import { computeIRR } from '@/lib/metrics/reiMetrics';

export interface HoldVsSellInput {
  estimatedCurrentValue: number;
  sellingCostPercent: number; // e.g. 6.0 for 6%
  mortgagePayoff: number;
  purchasePrice: number;
  totalCashInvested: number;
  monthlyGrossRent: number;
  monthlyExpenses: number;
  annualDebtService?: number;
  annualAppreciationPercent?: number;
  holdYears?: number;
}

export interface HoldVsSellResult {
  sellNow: {
    grossSalePrice: number;
    sellingCosts: number;
    mortgagePayoff: number;
    netProceeds: number;
    equityMultiple: number;
  };
  holdPath: {
    holdYears: number;
    annualCashFlow: number;
    cumulativeCashFlow: number;
    projectedTerminalValue: number;
    terminalSellingCosts: number;
    terminalMortgagePayoff: number;
    netTerminalProceeds: number;
    totalHoldNetReturns: number;
    irr: number; // percentage e.g. 14.5
    equityMultiple: number;
  };
  winner: 'HOLD' | 'SELL';
  netDifference: number; // Positive means Hold wins by $X, negative means Sell wins by $X
  verdictBanner: string; // Purely mathematical statement
}

export function computeHoldVsSellComparison(input: HoldVsSellInput): HoldVsSellResult {
  const sellingCostPct = Math.max(0, input.sellingCostPercent || 6.0);
  const holdYears = input.holdYears || 3;
  const appreciationRate = (input.annualAppreciationPercent ?? 3.0) / 100;
  const initialInvested = Math.max(1, input.totalCashInvested || 1);

  // 1. Sell Now Path
  const grossSellNow = Math.max(0, input.estimatedCurrentValue || 0);
  const sellNowCosts = grossSellNow * (sellingCostPct / 100);
  const sellNowPayoff = Math.max(0, input.mortgagePayoff || 0);
  const netProceedsSellNow = Math.max(0, grossSellNow - sellNowCosts - sellNowPayoff);
  const equityMultipleSellNow = Number((netProceedsSellNow / initialInvested).toFixed(2));

  // 2. Hold Path (Default 3 Years)
  const annualGrossRent = (input.monthlyGrossRent || 0) * 12;
  const annualExpenses = (input.monthlyExpenses || 0) * 12;
  const annualNOI = Math.max(0, annualGrossRent - annualExpenses);
  const annualDebtService = input.annualDebtService || 0;
  const annualCashFlow = annualNOI - annualDebtService;
  const cumulativeCashFlow = annualCashFlow * holdYears;

  // Terminal value after holdYears of appreciation
  const projectedTerminalValue = grossSellNow * Math.pow(1 + appreciationRate, holdYears);
  const terminalSellingCosts = projectedTerminalValue * (sellingCostPct / 100);
  // Estimate principal paydown over holdYears (approx 1.5% of loan balance per year)
  const estimatedPaydown = sellNowPayoff * 0.015 * holdYears;
  const terminalMortgagePayoff = Math.max(0, sellNowPayoff - estimatedPaydown);
  const netTerminalProceeds = Math.max(0, projectedTerminalValue - terminalSellingCosts - terminalMortgagePayoff);

  const totalHoldNetReturns = cumulativeCashFlow + netTerminalProceeds;
  const equityMultipleHold = Number((totalHoldNetReturns / initialInvested).toFixed(2));

  // IRR Calculation
  const irrCashFlows = [-initialInvested];
  for (let i = 1; i < holdYears; i++) {
    irrCashFlows.push(annualCashFlow);
  }
  irrCashFlows.push(annualCashFlow + netTerminalProceeds);

  let holdIRR = 0;
  try {
    const rawIRR = computeIRR(irrCashFlows);
    if (rawIRR !== null && !isNaN(rawIRR)) {
      holdIRR = Number((rawIRR * 100).toFixed(1));
    }
  } catch {
    holdIRR = 0;
  }

  // 3. Verdict & Comparison
  const netDifference = totalHoldNetReturns - netProceedsSellNow;
  const winner: 'HOLD' | 'SELL' = netDifference >= 0 ? 'HOLD' : 'SELL';

  const fmtCurrency = (val: number) =>
    val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  let verdictBanner = '';
  if (winner === 'HOLD') {
    verdictBanner = `Hold 3-Years projects ${fmtCurrency(netDifference)} higher total net proceeds (${equityMultipleHold.toFixed(2)}x equity multiple, ${holdIRR}% IRR) compared to selling now.`;
  } else {
    verdictBanner = `Sell Now yields ${fmtCurrency(Math.abs(netDifference))} higher immediate liquidity (${fmtCurrency(netProceedsSellNow)} net proceeds) compared to holding for ${holdYears} years.`;
  }

  return {
    sellNow: {
      grossSalePrice: Math.round(grossSellNow),
      sellingCosts: Math.round(sellNowCosts),
      mortgagePayoff: Math.round(sellNowPayoff),
      netProceeds: Math.round(netProceedsSellNow),
      equityMultiple: equityMultipleSellNow,
    },
    holdPath: {
      holdYears,
      annualCashFlow: Math.round(annualCashFlow),
      cumulativeCashFlow: Math.round(cumulativeCashFlow),
      projectedTerminalValue: Math.round(projectedTerminalValue),
      terminalSellingCosts: Math.round(terminalSellingCosts),
      terminalMortgagePayoff: Math.round(terminalMortgagePayoff),
      netTerminalProceeds: Math.round(netTerminalProceeds),
      totalHoldNetReturns: Math.round(totalHoldNetReturns),
      irr: holdIRR,
      equityMultiple: equityMultipleHold,
    },
    winner,
    netDifference: Math.round(netDifference),
    verdictBanner,
  };
}

export interface ActualizedReturnsResult {
  actualIRR: number | null;
  actualEquityMultiple: number | null;
  totalCashInvested: number;
  netProfit: number;
  completenessPercent: number;
  missingFields: string[];
}

export function computeActualizedReturns(params: {
  purchasePrice: number;
  totalCashInvested: number;
  estimatedCurrentValue: number;
  loanAmount: number;
  monthlyGrossRent: number;
  monthlyExpenses: number;
  annualDebtService: number;
  createdAt: string | Date;
  soldDate?: string;
  isRealized: boolean;
  rentReceived?: { amount: number; date: string; confirmed: boolean }[];
  leaseIncome?: { amount: number; date: string; confirmed: boolean }[];
  opexTax?: { amount: number; date: string; confirmed: boolean }[];
  opexInsurance?: { amount: number; date: string; confirmed: boolean }[];
  opexSecurity?: { amount: number; date: string; confirmed: boolean }[];
  opexMaintenance?: { amount: number; date: string; confirmed: boolean }[];
  opexUtilities?: { amount: number; date: string; confirmed: boolean }[];
  opexManagement?: { amount: number; date: string; confirmed: boolean }[];
  opexHoa?: { amount: number; date: string; confirmed: boolean }[];
  opexCapex?: { amount: number; date: string; confirmed: boolean }[];
  sellingCostPercent?: number;
  mortgagePayoff?: number;
  actualSalePrice?: number;
  sellingCostsAmount?: number;
}): ActualizedReturnsResult {
  const purchasePrice = params.purchasePrice || 0;
  const loanAmount = params.loanAmount || 0;
  const monthlyGrossRent = params.monthlyGrossRent || 0;
  const estimatedCurrentValue = params.estimatedCurrentValue || 0;

  // 1. Calculate completeness
  const missingFields: string[] = [];
  if (!(purchasePrice > 0)) missingFields.push('financials.purchasePrice');
  if (!(monthlyGrossRent > 0)) missingFields.push('financials.monthlyGrossRent');
  if (!(loanAmount > 0)) missingFields.push('financials.loanAmount');
  if (!(estimatedCurrentValue > 0) && !params.isRealized) {
    missingFields.push('financials.estimatedCurrentValue');
  }

  const totalFields = 4;
  const completenessPercent = ((totalFields - missingFields.length) / totalFields) * 100;

  // 2. Initial investment basis
  const totalCashInvested = params.totalCashInvested || Math.max(1, purchasePrice - loanAmount);

  // 3. Operational months timeframe
  const start = params.createdAt ? new Date(params.createdAt) : new Date();
  const end = params.soldDate ? new Date(params.soldDate) : new Date();
  
  // Difference in months
  let monthsCount = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (monthsCount <= 0) monthsCount = 1;

  // 4. Construct monthly cash flows
  const monthlyCashFlows: number[] = [-totalCashInvested];

  // Helper to check if a transaction date falls in a specific month index (1-based relative to start)
  const isTransactionInMonth = (txDateStr: string, monthIdx: number) => {
    if (!txDateStr) return false;
    const txDate = new Date(txDateStr);
    const mDiff = (txDate.getFullYear() - start.getFullYear()) * 12 + (txDate.getMonth() - start.getMonth()) + 1;
    return mDiff === monthIdx;
  };

  // Extract rent received
  const rents = params.rentReceived || [];
  const leases = params.leaseIncome || [];
  
  // Extract opex categories
  const tax = params.opexTax || [];
  const ins = params.opexInsurance || [];
  const sec = params.opexSecurity || [];
  const maint = params.opexMaintenance || [];
  const util = params.opexUtilities || [];
  const mgmt = params.opexManagement || [];
  const hoa = params.opexHoa || [];
  const capex = params.opexCapex || [];

  const monthlyDebtService = params.annualDebtService ? (params.annualDebtService / 12) : 0;

  let totalOperatingIncome = 0;
  let totalOperatingExpenses = 0;
  let totalDebtServicePaid = 0;

  for (let m = 1; m <= monthsCount; m++) {
    // A. Operational revenue (Rent received + Lease income)
    const monthlyRentReceived = rents
      .filter(e => e.confirmed && isTransactionInMonth(e.date, m))
      .reduce((sum, e) => sum + e.amount, 0);

    const monthlyLeaseIncome = leases
      .filter(e => e.confirmed && isTransactionInMonth(e.date, m))
      .reduce((sum, e) => sum + e.amount, 0);

    const monthlyIncome = monthlyRentReceived > 0 
      ? monthlyRentReceived 
      : monthlyLeaseIncome > 0 
        ? monthlyLeaseIncome 
        : monthlyGrossRent; // Fallback to monthly gross rent assumption if no actuals entered for this month

    // B. Operational expenses (OpEx categories)
    const monthlyTax = tax.filter(e => e.confirmed && isTransactionInMonth(e.date, m)).reduce((sum, e) => sum + e.amount, 0);
    const monthlyIns = ins.filter(e => e.confirmed && isTransactionInMonth(e.date, m)).reduce((sum, e) => sum + e.amount, 0);
    const monthlySec = sec.filter(e => e.confirmed && isTransactionInMonth(e.date, m)).reduce((sum, e) => sum + e.amount, 0);
    const monthlyMaint = maint.filter(e => e.confirmed && isTransactionInMonth(e.date, m)).reduce((sum, e) => sum + e.amount, 0);
    const monthlyUtil = util.filter(e => e.confirmed && isTransactionInMonth(e.date, m)).reduce((sum, e) => sum + e.amount, 0);
    const monthlyMgmt = mgmt.filter(e => e.confirmed && isTransactionInMonth(e.date, m)).reduce((sum, e) => sum + e.amount, 0);
    const monthlyHoa = hoa.filter(e => e.confirmed && isTransactionInMonth(e.date, m)).reduce((sum, e) => sum + e.amount, 0);
    const monthlyCapex = capex.filter(e => e.confirmed && isTransactionInMonth(e.date, m)).reduce((sum, e) => sum + e.amount, 0);

    const monthlyOpexSum = monthlyTax + monthlyIns + monthlySec + monthlyMaint + monthlyUtil + monthlyMgmt + monthlyHoa + monthlyCapex;
    
    // Fallback to monthly opex assumption if no actuals entered
    const monthlyOpex = monthlyOpexSum > 0 ? monthlyOpexSum : params.monthlyExpenses;

    // C. Debt service
    const debtService = monthlyDebtService;

    // D. Monthly Net Cash Flow
    const monthlyNetFlow = monthlyIncome - monthlyOpex - debtService;

    // Track cumulative values
    totalOperatingIncome += monthlyIncome;
    totalOperatingExpenses += monthlyOpex;
    totalDebtServicePaid += debtService;

    if (m === monthsCount) {
      // Add net exit proceeds to the final month
      const salePrice = params.isRealized
        ? (params.actualSalePrice || estimatedCurrentValue)
        : estimatedCurrentValue;
      
      const sellingCostPct = params.sellingCostPercent ?? 6.0;
      const sellingCosts = params.sellingCostsAmount ?? (salePrice * (sellingCostPct / 100));
      
      const payoff = params.mortgagePayoff ?? loanAmount;
      const netExitProceeds = Math.max(0, salePrice - sellingCosts - payoff);

      monthlyCashFlows.push(monthlyNetFlow + netExitProceeds);
    } else {
      monthlyCashFlows.push(monthlyNetFlow);
    }
  }

  // 5. Compute IRR & Equity Multiple
  let actualIRR: number | null = null;
  try {
    const rawIRR = computeIRR(monthlyCashFlows);
    if (rawIRR !== null && !isNaN(rawIRR)) {
      // Annualize the monthly rate: (1 + r)^12 - 1
      const annualizedRate = Math.pow(1 + rawIRR, 12) - 1;
      actualIRR = Number((annualizedRate * 100).toFixed(1));
    }
  } catch (err) {
    console.error('Failed to solve actualized IRR:', err);
  }

  // Fallback if IRR solver failed to converge: simple ROI / time based
  const totalOperatingNetCashFlow = totalOperatingIncome - totalOperatingExpenses - totalDebtServicePaid;
  const salePriceVal = params.isRealized ? (params.actualSalePrice || estimatedCurrentValue) : estimatedCurrentValue;
  const sellingCostPctVal = params.sellingCostPercent ?? 6.0;
  const sellingCostsVal = params.sellingCostsAmount ?? (salePriceVal * (sellingCostPctVal / 100));
  const payoffVal = params.mortgagePayoff ?? loanAmount;
  const netExitProceedsVal = Math.max(0, salePriceVal - sellingCostsVal - payoffVal);

  const totalCashReturned = totalOperatingNetCashFlow + netExitProceedsVal;
  const netProfit = totalCashReturned - totalCashInvested;
  
  const actualEquityMultiple = totalCashInvested > 0 
    ? Number((totalCashReturned / totalCashInvested).toFixed(2))
    : null;

  if (actualIRR === null && actualEquityMultiple !== null && actualEquityMultiple > 0) {
    // Simple CAGR / linear fallback
    const holdPeriodYears = monthsCount / 12;
    if (holdPeriodYears > 0) {
      const cagr = Math.pow(actualEquityMultiple, 1 / holdPeriodYears) - 1;
      actualIRR = Number((cagr * 100).toFixed(1));
    }
  }

  return {
    actualIRR,
    actualEquityMultiple,
    totalCashInvested,
    netProfit,
    completenessPercent,
    missingFields,
  };
}

