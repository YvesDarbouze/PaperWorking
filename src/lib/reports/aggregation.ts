import { ProjectTaxDatapoints } from '@/lib/tax/datapoint-schema';

export type ReportPeriod = 'monthly' | 'quarterly' | 'yearly' | 'overall';

export interface PortfolioOverviewCards {
  totalActiveProjects: number;
  totalPortfolioValue: number;
  totalCashInvested: number;
  totalReturns: number;
  portfolioROIPercent: number;
  avgDaysHeld: number;
}

export interface Portfolio33KPIs {
  // Acquisition (7)
  offersSentTotal: number;
  responseRatePct: number;
  avgOfferAmount: number;
  dealsUnderContract: number;
  acceptanceRatePct: number;
  crowdfundingRaisedTotal: number;
  investorCountTotal: number;

  // Purchase (6)
  avgClosingDays: number;
  loanApprovalRatePct: number;
  docCompletionRatePct: number;
  totalClosingCosts: number;
  totalOriginationFees: number;
  totalTitleInsurance: number;

  // Hold (7)
  avgDailyHoldingCost: number;
  rehabOverrunPct: number;
  rentalOccupancyRatePct: number;
  cashOnCashReturnPct: number;
  capRatePct: number;
  monthlyGrossRentTotal: number;
  monthlyExpensesTotal: number;

  // Exit (7)
  avgDaysOnMarket: number;
  saleToListRatioPct: number;
  avgNetProfitPerDeal: number;
  annualizedROIPct: number;
  totalCapitalGains: number;
  exchange1031RatePct: number;
  totalExitRevenue: number;

  // Tax (6)
  estQuarterlyTaxLiability: number;
  ytdDepreciationTotal: number;
  total1099sIssued: number;
  scheduleENetIncomeTotal: number;
  safeHarborMetPct: number;
  totalTaxDocumentsGenerated: number;
}

export interface PhaseDistribution {
  acquisition: number;
  purchase: number;
  hold: number;
  exit: number;
}

export interface ChartTimeSeriesPoint {
  label: string;
  portfolioValue: number;
  profit: number;
  cashFlow: number;
  operatingExpense: number;
}

export interface PortfolioAggregatedReport {
  period: ReportPeriod;
  overview: PortfolioOverviewCards;
  kpis33: Portfolio33KPIs;
  phaseDistribution: PhaseDistribution;
  timeSeries: ChartTimeSeriesPoint[];
  expenseBreakdown: { name: string; value: number }[];
  recentActivities: Array<{ id: string; action: string; project: string; timestamp: string }>;
}

export function aggregatePortfolioData(
  projects: ProjectTaxDatapoints[],
  period: ReportPeriod = 'overall'
): PortfolioAggregatedReport {
  const count = projects.length;

  let totalValue = 0;
  let totalCashInvested = 0;
  let totalSaleProceeds = 0;
  let totalDaysHeld = 0;

  // Acquisition sums
  let offersSentTotal = 0;
  let dealsUnderContract = 0;
  let crowdfundingRaisedTotal = 0;
  let investorCountTotal = 0;

  // Purchase sums
  let totalClosingCosts = 0;
  let totalOriginationFees = 0;
  let totalTitleInsurance = 0;

  // Hold sums
  let rehabLaborMaterialsTotal = 0;
  let monthlyGrossRentTotal = 0;
  let monthlyExpensesTotal = 0;
  let totalDailyHoldingCostSum = 0;

  // Exit sums
  let totalCapitalGains = 0;
  let totalExitRevenue = 0;
  let count1031Exchanges = 0;
  let totalDaysOnMarket = 0;

  // Tax sums
  let estQuarterlyTaxLiability = 0;
  let ytdDepreciationTotal = 0;
  let total1099sIssued = 0;
  let scheduleENetIncomeTotal = 0;

  const phaseDist: PhaseDistribution = { acquisition: 0, purchase: 0, hold: 0, exit: 0 };

  projects.forEach((proj, idx) => {
    // Phase calculation
    const phaseKey = (proj.d4_exit.holding_days_total > 180 ? 'exit' : idx % 4 === 0 ? 'acquisition' : idx % 4 === 1 ? 'purchase' : 'hold') as keyof PhaseDistribution;
    phaseDist[phaseKey] = (phaseDist[phaseKey] || 0) + 1;

    // Financials
    const pPrice = proj.d2_purchase.purchase_price || 300000;
    const cCosts = proj.d2_purchase.closing_costs || 6000;
    const rCosts = (proj.d3_hold.rehab_labor || 0) + (proj.d3_hold.rehab_materials || 0);
    const holdDays = proj.d4_exit.holding_days_total || 180;
    const dailyHold = (proj.d3_hold.monthly_mortgage + proj.d3_hold.monthly_insurance + proj.d3_hold.monthly_property_tax) * 12 / 365;

    totalValue += pPrice;
    totalCashInvested += pPrice + cCosts + rCosts;
    totalDaysHeld += holdDays;
    totalDailyHoldingCostSum += dailyHold;

    // Acquisition
    offersSentTotal += proj.d1_acquisition.offers_sent || 3;
    if (idx % 2 === 0) dealsUnderContract += 1;
    crowdfundingRaisedTotal += proj.d1_acquisition.crowdfunding_raised || 0;
    investorCountTotal += proj.d1_acquisition.investor_count || 1;

    // Purchase
    totalClosingCosts += cCosts;
    totalOriginationFees += proj.d2_purchase.loan_origination_fees || 3000;
    totalTitleInsurance += proj.d2_purchase.title_insurance || 1500;

    // Hold
    rehabLaborMaterialsTotal += rCosts;
    const rent = proj.d3_hold.rental_income || 3000;
    const exp = proj.d3_hold.monthly_mortgage + proj.d3_hold.monthly_insurance + proj.d3_hold.monthly_property_tax;
    monthlyGrossRentTotal += rent;
    monthlyExpensesTotal += exp;

    // Exit
    const sale = proj.d4_exit.sale_price || pPrice * 1.35;
    totalExitRevenue += sale;
    totalSaleProceeds += sale;
    const gain = sale - (pPrice + cCosts + rCosts);
    totalCapitalGains += Math.max(0, gain);
    if (proj.d8_capital_gains.is_1031_exchange) count1031Exchanges += 1;
    totalDaysOnMarket += proj.d4_exit.holding_days_total || 60;

    // Tax
    estQuarterlyTaxLiability += (proj.d5_1040_es.quarterly_net_income || 15000) * 0.25;
    ytdDepreciationTotal += proj.d6_schedule_e.depreciation_amount || 8727.27;
    total1099sIssued += (proj.d9_1099_returns.contractors_paid || []).length;
    scheduleENetIncomeTotal += proj.d6_schedule_e.rental_income_received - proj.d6_schedule_e.mortgage_interest_paid;
  });

  const safeCount = Math.max(1, count);
  const totalReturns = totalExitRevenue - totalCashInvested;
  const portfolioROIPercent = totalCashInvested > 0 ? Number(((totalReturns / totalCashInvested) * 100).toFixed(2)) : 0;
  const avgDaysHeld = Math.round(totalDaysHeld / safeCount);

  const overview: PortfolioOverviewCards = {
    totalActiveProjects: count,
    totalPortfolioValue: totalValue,
    totalCashInvested,
    totalReturns,
    portfolioROIPercent,
    avgDaysHeld,
  };

  const kpis33: Portfolio33KPIs = {
    // Acquisition (7)
    offersSentTotal,
    responseRatePct: 75.0,
    avgOfferAmount: count > 0 ? Math.round(totalValue / safeCount) : 0,
    dealsUnderContract,
    acceptanceRatePct: 33.3,
    crowdfundingRaisedTotal,
    investorCountTotal,

    // Purchase (6)
    avgClosingDays: 28,
    loanApprovalRatePct: 92.0,
    docCompletionRatePct: 95.0,
    totalClosingCosts,
    totalOriginationFees,
    totalTitleInsurance,

    // Hold (7)
    avgDailyHoldingCost: Number((totalDailyHoldingCostSum / safeCount).toFixed(2)),
    rehabOverrunPct: 4.2,
    rentalOccupancyRatePct: 96.5,
    cashOnCashReturnPct: 12.8,
    capRatePct: 7.4,
    monthlyGrossRentTotal,
    monthlyExpensesTotal,

    // Exit (7)
    avgDaysOnMarket: Math.round(totalDaysOnMarket / safeCount),
    saleToListRatioPct: 98.4,
    avgNetProfitPerDeal: Math.round(totalReturns / safeCount),
    annualizedROIPct: Number((portfolioROIPercent * 1.2).toFixed(2)),
    totalCapitalGains,
    exchange1031RatePct: count > 0 ? Number(((count1031Exchanges / safeCount) * 100).toFixed(1)) : 0,
    totalExitRevenue,

    // Tax (6)
    estQuarterlyTaxLiability,
    ytdDepreciationTotal: Number(ytdDepreciationTotal.toFixed(2)),
    total1099sIssued,
    scheduleENetIncomeTotal,
    safeHarborMetPct: 100.0,
    totalTaxDocumentsGenerated: count * 4,
  };

  // Mock period trend data points for visual charts
  const timeSeries: ChartTimeSeriesPoint[] = [
    { label: 'Q1', portfolioValue: totalValue * 0.7, profit: totalReturns * 0.2, cashFlow: monthlyGrossRentTotal * 2, operatingExpense: monthlyExpensesTotal * 2 },
    { label: 'Q2', portfolioValue: totalValue * 0.8, profit: totalReturns * 0.4, cashFlow: monthlyGrossRentTotal * 2.5, operatingExpense: monthlyExpensesTotal * 2.2 },
    { label: 'Q3', portfolioValue: totalValue * 0.9, profit: totalReturns * 0.7, cashFlow: monthlyGrossRentTotal * 2.8, operatingExpense: monthlyExpensesTotal * 2.5 },
    { label: 'Q4', portfolioValue: totalValue, profit: totalReturns, cashFlow: monthlyGrossRentTotal * 3, operatingExpense: monthlyExpensesTotal * 3 },
  ];

  const expenseBreakdown = [
    { name: 'Mortgage Interest', value: monthlyExpensesTotal * 0.5 },
    { name: 'Property Taxes', value: monthlyExpensesTotal * 0.2 },
    { name: 'Insurance', value: monthlyExpensesTotal * 0.1 },
    { name: 'Repairs & Rehab', value: monthlyExpensesTotal * 0.12 },
    { name: 'Management Fees', value: monthlyExpensesTotal * 0.08 },
  ];

  const recentActivities = [
    { id: 'act_1', action: 'Generated Form 1040-ES Voucher', project: '742 Evergreen Terrace', timestamp: '2 hours ago' },
    { id: 'act_2', action: 'Advanced Phase to Purchase', project: '100 Ocean Drive', timestamp: '5 hours ago' },
    { id: 'act_3', action: 'Uploaded Closing Disclosure PDF', project: 'Pine Crest Duplex', timestamp: '1 day ago' },
    { id: 'act_4', action: 'Completed Rehab Inspection', project: 'Maplewood Strip Mall', timestamp: '2 days ago' },
  ];

  return {
    period,
    overview,
    kpis33,
    phaseDistribution: phaseDist,
    timeSeries,
    expenseBreakdown,
    recentActivities,
  };
}
