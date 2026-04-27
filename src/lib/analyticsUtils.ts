import { Project, ProjectFinancials, LedgerItem } from '@/types/schema';

/* ═══════════════════════════════════════════════════════════════
   Analytics Core Engine — Unified Financial Math
   
   This utility serves as the "Single Source of Truth" for all
   ROI, Profit, and Performance metrics displayed in charts, 
   P&L statements, and tactical panels.
   ═══════════════════════════════════════════════════════════════ */

export interface DetailedProjectMetrics {
  purchasePrice: number;
  renovationCosts: number;
  closingCostsBuy: number;
  closingCostsSell: number;
  holdingCosts: number;
  salePrice: number;
  netProfit: number;
  roi: number;
  annualizedIrr: number;
  holdDays: number;
  totalInvestment: number;
  breakEvenPrice: number;
}

/**
 * Calculates comprehensive metrics for a single project.
 */
export function calculateProjectMetrics(
  deal: Project, 
  ledgerItems: LedgerItem[] = [], 
  whatIfOffsetMonths: number = 0
): DetailedProjectMetrics {
  const purchasePrice = deal.financials?.purchasePrice || 0;

  // ─── 1. Renovation Costs
  let renovationCosts = 0;
  if (ledgerItems.length > 0) {
    ledgerItems.forEach(item => {
      if (item.status === 'Approved') renovationCosts += item.amount;
    });
  } else if (deal.financials?.costs) {
    deal.financials.costs.forEach(c => {
      if (c.approved) renovationCosts += c.amount;
    });
  }
  
  const inspectionsCost = deal.financials?.inspections?.reduce((acc, curr) => acc + (curr.actualCost || 0), 0) || 0;
  const rehabExpenses = deal.rehabExpenses?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;
  renovationCosts += inspectionsCost + rehabExpenses;

  // ─── 2. Capital Costs (Closing Costs Buy)
  const interestRate = (deal.financials?.loanInterestRate || 0) / 100;
  const points = (deal.financials?.loanOriginationPoints || 0) / 100;
  const loanAmount = deal.financials?.loanAmount || (purchasePrice + renovationCosts);
  const closingCostsBuy = loanAmount * points;

  // ─── 3. Holding Costs
  const now = new Date();
  const soldDate = deal.financials?.soldDate ? new Date(deal.financials.soldDate) : null;
  const createdDate = new Date(deal.createdAt || now);

  let holdDays = deal.financials?.estimatedTimelineDays || 90;
  if (soldDate) {
    const ms = soldDate.getTime() - createdDate.getTime();
    holdDays = Math.max(1, ms / (1000 * 60 * 60 * 24));
  } else {
    const ms = now.getTime() - createdDate.getTime();
    const elapsed = ms / (1000 * 60 * 60 * 24);
    holdDays = Math.max(holdDays, elapsed);
  }

  const adjustedMonths = Math.max(0, holdDays / 30 + whatIfOffsetMonths);
  const timelineYears = adjustedMonths / 12;
  const holdingCosts = loanAmount * interestRate * timelineYears;

  // ─── 4. Sale Price & Sell-Side Costs
  const salePrice = deal.financials?.actualSalePrice || deal.financials?.estimatedARV || 0;
  const buyerPercent = deal.financials?.buyersAgentCommission || 0;
  const sellerPercent = deal.financials?.sellersAgentCommission || 0;
  const agentCommissions = salePrice * ((buyerPercent + sellerPercent) / 100);
  const finalClosingCosts = deal.financials?.finalClosingCosts || 0;

  let ledgerExitCosts = 0;
  deal.exitCosts?.forEach(ec => {
    if (ec.isPercentage && ec.percentageRate) {
      ledgerExitCosts += (ec.percentageRate / 100) * salePrice;
    } else {
      ledgerExitCosts += ec.amount;
    }
  });

  const closingCostsSell = agentCommissions + finalClosingCosts + ledgerExitCosts;

  // ─── 5. Final Totals
  const totalInvestment = purchasePrice + closingCostsBuy + closingCostsSell + renovationCosts + holdingCosts;
  const netProfit = salePrice - totalInvestment;
  const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
  const annualizedIrr = holdDays > 0 ? roi * (365 / holdDays) : 0;
  
  // Break-even is roughly the point where SalePrice = TotalCosts (including commissions)
  // Simplified: SalePrice * (1 - Comm%) = Purchase + Reno + Holding + ClosingBuy
  const totalBurdenWithoutSaleComms = purchasePrice + renovationCosts + closingCostsBuy + finalClosingCosts + holdingCosts;
  const commPercent = (buyerPercent + sellerPercent) / 100;
  const breakEvenPrice = totalBurdenWithoutSaleComms / (1 - commPercent);

  return {
    purchasePrice,
    renovationCosts,
    closingCostsBuy,
    closingCostsSell,
    holdingCosts,
    salePrice,
    netProfit,
    roi,
    annualizedIrr,
    holdDays,
    totalInvestment,
    breakEvenPrice,
  };
}

/**
 * Generates time-series data for cumulative spend (Actual vs Projected)
 */
export function calculateSpendSeries(deal: Project, ledgerItems: LedgerItem[] = []) {
  const fin = deal.financials;
  const totalBudget = fin?.projectedRehabCost || (fin?.estimatedARV ? fin.estimatedARV * 0.3 : 50000);

  // Merge all costs with dates
  const approvedCosts = (fin?.costs || []).filter(c => c.approved).map(c => ({ date: new Date(c.createdAt), amount: c.amount }));
  const ledgerApproved = ledgerItems.filter(i => i.status === 'Approved').map(i => ({ date: new Date(i.createdAt), amount: i.amount }));
  const rehabExpenses = (deal.rehabExpenses || []).map(e => ({ date: new Date(e.createdAt), amount: e.amount }));

  const allActuals = [...approvedCosts, ...ledgerApproved, ...rehabExpenses].sort((a, b) => a.date.getTime() - b.date.getTime());

  const timelineDays = fin?.estimatedTimelineDays || 120;
  const totalWeeks = Math.max(4, Math.ceil(timelineDays / 7));
  
  // S-Curve logic for projection: Spending is slower at start/end
  const getSCurveMultiplier = (progress: number) => {
    // Basic S-curve formula: 3x^2 - 2x^3
    return 3 * Math.pow(progress, 2) - 2 * Math.pow(progress, 3);
  };

  const startDate = allActuals.length > 0 ? allActuals[0].date : new Date(deal.createdAt);
  const data = [];
  
  for (let w = 1; w <= Math.min(totalWeeks, 26); w++) {
    const weekEnd = new Date(startDate.getTime() + w * 7 * 24 * 60 * 60 * 1000);
    const cumulativeActual = allActuals.filter(s => s.date <= weekEnd).reduce((sum, s) => sum + s.amount, 0);
    
    const progress = w / totalWeeks;
    const projectedMultiplier = getSCurveMultiplier(progress);

    data.push({
      week: `W${w}`,
      projected: Math.round(totalBudget * projectedMultiplier),
      actual: Math.round(cumulativeActual),
    });
  }

  return data;
}

/**
 * Calculates Maximum Allowable Offer (MAO) based on the 70% rule.
 * MAO = (ARV * 0.70) - Renovation Costs
 */
export function calculateMAO(arv: number, renovationCosts: number): number {
  return (arv * 0.70) - renovationCosts;
}

/**
 * Computes median value from an array of numbers.
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Aggregate portfolio metrics.
 */
export function calculatePortfolioSummary(projects: Project[]) {
  const soldDeals = projects.filter(d => d.status === 'Sold');
  const activeDeals = projects.filter(d => d.status !== 'Sold');

  const soldMetrics = soldDeals.map(d => calculateProjectMetrics(d));
  const activeMetrics = activeDeals.map(d => calculateProjectMetrics(d));

  const totalSoldProfit = soldMetrics.reduce((sum, m) => sum + m.netProfit, 0);
  const totalSoldInvestment = soldMetrics.reduce((sum, m) => sum + m.totalInvestment, 0);
  
  const avgGrossProfit = soldDeals.length > 0 ? totalSoldProfit / soldDeals.length : 0;
  const avgROI = totalSoldInvestment > 0 ? (totalSoldProfit / totalSoldInvestment) * 100 : 0;
  
  const resalePrices = soldMetrics.map(m => m.salePrice).filter(p => p > 0);
  const medianResalePrice = calculateMedian(resalePrices);
  
  const activeCapitalDeployed = activeMetrics.reduce((sum, m) => {
    // For active deals, investment is purchasePrice + closingCostsBuy + renovationCosts + holdingCosts (to date)
    return sum + m.purchasePrice + m.closingCostsBuy + m.renovationCosts + m.holdingCosts;
  }, 0);


  return {
    avgGrossProfit,
    avgROI,
    medianResalePrice,
    activeCapitalDeployed,
    soldCount: soldDeals.length,
    activeCount: activeDeals.length,
    totalPortfolioValue: projects.reduce((sum, p) => sum + (p.financials?.estimatedARV || 0), 0)
  };
}

/**
 * Calculates portfolio-wide burn rates and velocity projections.
 */
export function calculatePortfolioVelocity(projects: Project[]) {
  const now = new Date();
  const activeDeals = projects.filter(d => d.status !== 'Sold' && d.status !== 'Lead');
  
  let totalDailyBurn = 0;
  const projections: { date: Date; address: string; amount: number; type: 'Projected' | 'Actual' }[] = [];
  const ageBuckets = { '0-30': 0, '31-60': 0, '61-90': 0, '91+': 0 };

  activeDeals.forEach(deal => {
    // 1. Burn Rate Calculation
    let monthlyBurn = 0;
    if (deal.holdingCosts && Array.isArray(deal.holdingCosts)) {
      monthlyBurn = deal.holdingCosts.reduce((sum, hc) => sum + (hc.monthlyAmount || 0), 0);
    }
    
    // Fallback if no holding costs explicitly set
    if (monthlyBurn === 0 && deal.financials?.purchasePrice) {
      const loanAmount = deal.financials.loanAmount || deal.financials.purchasePrice;
      const rate = (deal.financials.loanInterestRate || 10) / 100;
      monthlyBurn = (loanAmount * rate) / 12;
    }
    
    totalDailyBurn += monthlyBurn / 30;

    // 2. Inventory Aging
    const baseDate = deal.financials?.listingDate 
      ? new Date(deal.financials.listingDate) 
      : new Date(deal.createdAt);
    const daysHeld = Math.max(0, Math.floor((now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    if (daysHeld <= 30) ageBuckets['0-30']++;
    else if (daysHeld <= 60) ageBuckets['31-60']++;
    else if (daysHeld <= 90) ageBuckets['61-90']++;
    else ageBuckets['91+']++;

    // 3. Projections
    const timelineDays = deal.financials?.estimatedTimelineDays || 120;
    const projectedCloseDate = new Date(baseDate.getTime() + timelineDays * 24 * 60 * 60 * 1000);
    
    if (projectedCloseDate > now) {
      projections.push({
        date: projectedCloseDate,
        address: deal.address || deal.propertyName || 'Unnamed Property',
        amount: deal.financials?.estimatedARV || 0,
        type: 'Projected'
      });
    }
  });

  return {
    totalDailyBurn,
    totalMonthlyBurn: totalDailyBurn * 30,
    ageBuckets,
    projections: projections.sort((a, b) => a.date.getTime() - b.date.getTime())
  };
}
