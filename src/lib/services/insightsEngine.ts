/**
 * 📉 InsightsEngine Service
 * 
 * calculates short-term (Year 1 baseline) and long-term (10-year pro forma) 
 * projections to feed interactive charts on the insights page.
 * 
 * Math verified against standard CCIM / real estate investment conventions.
 */

export interface InsightsEngineInputs {
  purchasePrice: number;
  rehabBudget: number;
  downPayment: number;
  interestRate: number;        // e.g. 6.5 for 6.5%
  amortizationTerm: number;    // in years, e.g. 30
  grossScheduledIncome: number;// annual gross scheduled rent
  operatingExpenses: number;   // annual OpEx
  vacancyRate: number;         // e.g. 5 for 5%
  marketData: {
    daysOnMarket: number;
    medianHomePrice: number;
    averageRent: number;       // monthly rent
    source?: string;
    asOf?: string;
  };
}

export interface ShortTermMetrics {
  noi: number;
  capRate: number;
  cashOnCash: number;
  grm: number;
  oer: number;
  vacancyRate: number;
}

export interface LongTermMetrics {
  years: number[];
  noi: number[];
  cashFlow: number[];
  cumulativeRoi: number[];
  dscr: number[];
}

export interface MarketInsights {
  daysOnMarket: number;
  priceToRentRatio: number;
  source?: string;
  asOf?: string;
}

export interface InsightsEngineResult {
  shortTerm: ShortTermMetrics;
  longTerm: LongTermMetrics;
  marketInsights: MarketInsights;
}

export interface ProjectionAssumptions {
  incomeGrowthRate?: number;    // e.g. 0.03 for 3%
  expenseGrowthRate?: number;   // e.g. 0.025 for 2.5%
  appreciationRate?: number;    // e.g. 0.03 for 3%
}

export const InsightsEngine = {
  /**
   * Calculates pro forma real estate datasets based on property financials and market inputs.
   */
  calculate(
    inputs: InsightsEngineInputs,
    assumptions: ProjectionAssumptions = {}
  ): InsightsEngineResult {
    const {
      purchasePrice,
      rehabBudget,
      downPayment,
      interestRate,
      amortizationTerm,
      grossScheduledIncome,
      operatingExpenses,
      vacancyRate,
      marketData
    } = inputs;

    // Default growth rate assumptions
    const incomeGrowth = assumptions.incomeGrowthRate ?? 0.03;  // 3% standard
    const expenseGrowth = assumptions.expenseGrowthRate ?? 0.025; // 2.5% standard
    const appreciation = assumptions.appreciationRate ?? 0.03;   // 3% standard

    const loanAmount = Math.max(0, purchasePrice - downPayment);
    const totalCashInvested = downPayment + rehabBudget;

    // ── 1. Amortization Schedule Generation with Month 360/Final Month Adjustment ──
    const totalMonths = Math.max(0, amortizationTerm * 12);
    const monthlyRate = (interestRate / 100) / 12;
    let monthlyPayment = 0;

    if (loanAmount > 0 && totalMonths > 0) {
      if (monthlyRate > 0) {
        const pow = Math.pow(1 + monthlyRate, totalMonths);
        monthlyPayment = loanAmount * (monthlyRate * pow) / (pow - 1);
      } else {
        monthlyPayment = loanAmount / totalMonths;
      }
    }

    // Round monthly payment to standard cents
    monthlyPayment = Math.round(monthlyPayment * 100) / 100;

    let balance = loanAmount;
    const monthlyAmortization: {
      month: number;
      payment: number;
      principal: number;
      interest: number;
      remainingBalance: number;
    }[] = [];

    for (let m = 1; m <= totalMonths; m++) {
      let interest = 0;
      if (monthlyRate > 0) {
        interest = Math.round((balance * monthlyRate) * 100) / 100;
      }
      
      let principal = Math.round((monthlyPayment - interest) * 100) / 100;

      // Amortization Drift Reconciliation Guard:
      // If last month, adjust principal to match exactly the remaining balance
      if (m === totalMonths) {
        principal = balance;
        monthlyPayment = Math.round((principal + interest) * 100) / 100;
      }

      // Safeguard against rounding errors causing principal to exceed balance
      if (principal > balance) {
        principal = balance;
        monthlyPayment = Math.round((principal + interest) * 100) / 100;
      }

      balance = Math.max(0, Math.round((balance - principal) * 100) / 100);

      monthlyAmortization.push({
        month: m,
        payment: principal + interest,
        principal,
        interest,
        remainingBalance: balance
      });
    }

    // Helper to get annual debt service and remaining balance for a specific year
    const getYearlyDebtService = (year: number) => {
      const startMonth = (year - 1) * 12 + 1;
      const endMonth = year * 12;
      let totalPayment = 0;
      let totalPrincipal = 0;

      for (let m = startMonth; m <= endMonth; m++) {
        const record = monthlyAmortization[m - 1];
        if (record) {
          totalPayment += record.payment;
          totalPrincipal += record.principal;
        }
      }

      const endRecord = monthlyAmortization[endMonth - 1];
      const remainingBalance = endRecord ? endRecord.remainingBalance : 0;

      return {
        annualDebtService: Math.round(totalPayment * 100) / 100,
        principalPaid: Math.round(totalPrincipal * 100) / 100,
        remainingBalance
      };
    };

    // ── 2. Short-Term Baseline Calculations (Year 1) ──
    const yr1EGI = grossScheduledIncome * (1 - vacancyRate / 100);
    const yr1NOI = Math.round((yr1EGI - operatingExpenses) * 100) / 100;
    
    // Cap Rate: (NOI / Purchase Price) * 100
    const yr1CapRate = purchasePrice > 0 
      ? Math.round((yr1NOI / purchasePrice) * 100 * 100) / 100
      : 0;

    // Year 1 Debt Service
    const yr1Finances = getYearlyDebtService(1);
    const yr1PreTaxCashFlow = yr1NOI - yr1Finances.annualDebtService;
    
    // Cash-on-Cash Return: (Cash Flow / Total Cash Invested) * 100
    const yr1CoC = totalCashInvested > 0
      ? Math.round((yr1PreTaxCashFlow / totalCashInvested) * 100 * 100) / 100
      : 0;

    // Gross Rent Multiplier (GRM): Property Price / Gross Annual Rent
    const yr1GRM = grossScheduledIncome > 0
      ? Math.round((purchasePrice / grossScheduledIncome) * 100) / 100
      : 0;

    // Operating Expense Ratio (OER): (Total OpEx / EGI) * 100
    const yr1OER = yr1EGI > 0
      ? Math.round((operatingExpenses / yr1EGI) * 100 * 100) / 100
      : 0;

    // ── 3. Long-Term Multi-Period Calculations (10-Year Pro Forma) ──
    const years: number[] = [];
    const projectedNOI: number[] = [];
    const projectedCashFlow: number[] = [];
    const projectedCumulativeRoi: number[] = [];
    const projectedDSCR: number[] = [];

    let currentGrossRent = grossScheduledIncome;
    let currentOpEx = operatingExpenses;
    let cumulativeCashFlow = 0;

    for (let y = 1; y <= 10; y++) {
      years.push(y);

      // Project income & expenses for the year
      if (y > 1) {
        currentGrossRent = currentGrossRent * (1 + incomeGrowth);
        currentOpEx = currentOpEx * (1 + expenseGrowth);
      }

      const egi = currentGrossRent * (1 - vacancyRate / 100);
      const noi = Math.round((egi - currentOpEx) * 100) / 100;
      projectedNOI.push(noi);

      // Debt service for the current year
      const yearlyFinances = getYearlyDebtService(y);
      const ads = yearlyFinances.annualDebtService;

      // Cash Flow
      const cashFlow = Math.round((noi - ads) * 100) / 100;
      projectedCashFlow.push(cashFlow);

      // Cumulative Cash Flow
      cumulativeCashFlow += cashFlow;

      // Property Appreciation (compounded annually)
      const appreciatedPropertyValue = purchasePrice * Math.pow(1 + appreciation, y);
      const equityAppreciation = appreciatedPropertyValue - purchasePrice;

      // Principal Paydown (original loan balance - remaining balance)
      // If loan term is shorter than hold period, remaining balance is 0
      const remainingBalance = y * 12 <= totalMonths 
        ? yearlyFinances.remainingBalance 
        : 0;
      const principalPaydown = Math.max(0, loanAmount - remainingBalance);

      // Net Profit: Cumulative Cash Flow + Home Appreciation + Principal Paydown
      const netProfit = cumulativeCashFlow + equityAppreciation + principalPaydown;

      // Cumulative ROI over time
      const cumulativeRoi = totalCashInvested > 0
        ? Math.round((netProfit / totalCashInvested) * 100 * 100) / 100
        : 0;
      projectedCumulativeRoi.push(cumulativeRoi);

      // DSCR: NOI / Annual Debt Service
      let dscr = 0;
      if (ads > 0) {
        dscr = Math.round((noi / ads) * 1000) / 1000;
      } else {
        dscr = noi > 0 ? 999 : 0; // Sentinel for all-cash/no-debt
      }
      projectedDSCR.push(dscr);
    }

    // ── 4. Market-Level Insights ──
    const priceToRentRatio = (marketData.averageRent * 12) > 0
      ? Math.round((marketData.medianHomePrice / (marketData.averageRent * 12)) * 10) / 10
      : 0;

    return {
      shortTerm: {
        noi: yr1NOI,
        capRate: yr1CapRate,
        cashOnCash: yr1CoC,
        grm: yr1GRM,
        oer: yr1OER,
        vacancyRate
      },
      longTerm: {
        years,
        noi: projectedNOI,
        cashFlow: projectedCashFlow,
        cumulativeRoi: projectedCumulativeRoi,
        dscr: projectedDSCR
      },
      marketInsights: {
        daysOnMarket: marketData.daysOnMarket,
        priceToRentRatio,
        source: marketData.source,
        asOf: marketData.asOf
      }
    };
  }
};
