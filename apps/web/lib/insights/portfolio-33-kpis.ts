/** Mirrors `@paperworking/api` Portfolio33KPIs for the Insights UI surface. */
export interface Portfolio33KPIs {
  offersSentTotal: number;
  responseRatePct: number;
  avgOfferAmount: number;
  dealsUnderContract: number;
  acceptanceRatePct: number;
  crowdfundingRaisedTotal: number;
  investorCountTotal: number;
  avgClosingDays: number;
  loanApprovalRatePct: number;
  docCompletionRatePct: number;
  totalClosingCosts: number;
  totalOriginationFees: number;
  totalTitleInsurance: number;
  avgDailyHoldingCost: number;
  rehabOverrunPct: number;
  rentalOccupancyRatePct: number;
  cashOnCashReturnPct: number;
  capRatePct: number;
  monthlyGrossRentTotal: number;
  monthlyExpensesTotal: number;
  avgDaysOnMarket: number;
  saleToListRatioPct: number;
  avgNetProfitPerDeal: number;
  annualizedROIPct: number;
  totalCapitalGains: number;
  exchange1031RatePct: number;
  totalExitRevenue: number;
  estQuarterlyTaxLiability: number;
  ytdDepreciationTotal: number;
  total1099sIssued: number;
  scheduleENetIncomeTotal: number;
  safeHarborMetPct: number;
  totalTaxDocumentsGenerated: number;
}

/** Seed fallback — same defaults as PaperWorking insights page when API is empty. */
export const DEFAULT_PORTFOLIO_33_KPIS: Portfolio33KPIs = {
  offersSentTotal: 42,
  responseRatePct: 64.2,
  avgOfferAmount: 285000,
  dealsUnderContract: 4,
  acceptanceRatePct: 21.5,
  crowdfundingRaisedTotal: 450000,
  investorCountTotal: 12,
  avgClosingDays: 28,
  loanApprovalRatePct: 92.0,
  docCompletionRatePct: 98.5,
  totalClosingCosts: 48500,
  totalOriginationFees: 12500,
  totalTitleInsurance: 6400,
  avgDailyHoldingCost: 142.5,
  rehabOverrunPct: 4.2,
  rentalOccupancyRatePct: 96.8,
  cashOnCashReturnPct: 14.8,
  capRatePct: 8.4,
  monthlyGrossRentTotal: 28400,
  monthlyExpensesTotal: 11200,
  avgDaysOnMarket: 34,
  saleToListRatioPct: 98.2,
  avgNetProfitPerDeal: 68500,
  annualizedROIPct: 24.6,
  totalCapitalGains: 274000,
  exchange1031RatePct: 75.0,
  totalExitRevenue: 1420000,
  estQuarterlyTaxLiability: 18400,
  ytdDepreciationTotal: 42500,
  total1099sIssued: 8,
  scheduleENetIncomeTotal: 84200,
  safeHarborMetPct: 100,
  totalTaxDocumentsGenerated: 14,
};

export function money(value: number): string {
  return `$${value.toLocaleString()}`;
}

export function pct(value: number): string {
  return `${value}%`;
}
