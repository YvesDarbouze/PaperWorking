import { Project } from '@/types/schema';

/**
 * Validates the viability of a deal via the standard 70% rule.
 * Maximum Allowable Offer (MAO) = (ARV * 0.70) - rehabCosts
 */
export function calculateSeventyPercentRule(arv: number, rehabCosts: number, purchasePrice: number) {
  const maximumAllowableOffer = (arv * 0.70) - rehabCosts;
  
  const isSetup = arv > 0 && rehabCosts > 0;
  // It's overbought if the purchase price is higher than the max allowable offer
  const isOverbought = isSetup && purchasePrice > maximumAllowableOffer;
  const variance = isSetup ? maximumAllowableOffer - purchasePrice : 0;

  return { MAO: maximumAllowableOffer, isSetup, isOverbought, variance };
}

/**
 * Generates the full Profitability Net Engine calculations.
 * Accounts for extreme timelines, commissions, and holding cost projections.
 */
export function calculateNetEngine(deal: Project, isBrrrr: boolean = false) {
  const purchasePrice = deal.financials?.purchasePrice || 0;
  
  let totalApprovedRehab = 0;
  deal.financials?.costs?.forEach(c => {
    if (c.approved) totalApprovedRehab += c.amount;
  });
  
  const inspectionsCost = deal.financials?.inspections?.reduce((acc, curr) => acc + curr.actualCost, 0) || 0;
  totalApprovedRehab += inspectionsCost;

  const interestRate = (deal.financials?.loanInterestRate || 0) / 100;
  const points = (deal.financials?.loanOriginationPoints || 0) / 100;
  
  const loanAmount = deal.financials?.loanAmount || (purchasePrice + totalApprovedRehab);
  const capitalCost = loanAmount * points;

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

  const timelineYears = holdDays / 365;
  const holdingCost = loanAmount * interestRate * timelineYears;

  const salePrice = deal.financials?.actualSalePrice || deal.financials?.estimatedARV || 0;
  const buyerPercent = deal.financials?.buyersAgentCommission || 0;
  const sellerPercent = deal.financials?.sellersAgentCommission || 0;
  const agentCommissions = salePrice * ((buyerPercent + sellerPercent) / 100);
  const finalClosingCosts = deal.financials?.finalClosingCosts || 0;

  const totalInvestment = purchasePrice + totalApprovedRehab + capitalCost + holdingCost;
  
  const ltvRatio = 0.75;
  const actualCommissions = isBrrrr ? 0 : agentCommissions;
  const proceeds = isBrrrr ? (salePrice * ltvRatio) : salePrice;

  const netProfit = proceeds - (totalInvestment + actualCommissions + finalClosingCosts);

  const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
  const annualizedIrr = holdDays > 0 ? roi * (365 / holdDays) : 0;

  return {
    totalApprovedRehab,
    capitalCost,
    holdingCost,
    holdDays,
    proceeds,
    actualCommissions,
    totalInvestment,
    netProfit,
    roi,
    annualizedIrr
  };
}

// ─── Autopsy Metrics Shape ───────────────────────────────────
export interface AutopsyMetrics {
  // Inputs
  grossSalePrice: number;
  purchasePrice: number;
  projectedRehabCost: number;   // estimatedARV-era budget target
  actualRehabCost: number;      // sum of approved cost entries + rehab expenses
  estimatedARV: number;
  acquisitionCosts: number;     // buy-side closing + origination points
  holdingCosts: number;         // recurring monthly costs accrued
  sellClosingCosts: number;     // commissions + exit fees
  totalCostBasis: number;       // sum of all five cost buckets above
  loanAmount: number;
  outOfPocketCash: number;      // totalCostBasis − loanAmount
  // Core KPIs (locked once status = Sold)
  netProfit: number;
  roi: number;                  // % — Net Profit / Total Cost Basis
  coc: number;                  // % — Net Profit / Out-of-Pocket Cash
  profitMargin: number;         // % — Net Profit / Gross Sale Price
  // Time metrics
  dom: number | null;           // Days on Market (listingDate → soldDate)
  holdDays: number | null;      // Total hold period (createdAt → soldDate)
}

/**
 * Single canonical autopsy math function. Used by DealAutopsy component and
 * the PDF generator. Derives all four KPIs required by the Phase 4 spec.
 *
 * All monetary values in the schema are stored as cents (integers). This
 * function works in raw schema units — callers display with / 100 where needed.
 * Note: purchasePrice and most fields here are already in dollars per ProjectFinancials.
 */
export function computeAutopsyMetrics(deal: Project): AutopsyMetrics {
  const fin = deal.financials;
  const purchasePrice = fin?.purchasePrice || 0;
  const grossSalePrice = fin?.actualSalePrice || fin?.estimatedARV || 0;
  const estimatedARV = fin?.estimatedARV || 0;
  const projectedRehabCost = fin?.projectedRehabCost || 0;

  // ── Actual Rehab Costs ──────────────────────────────────────
  let actualRehabCost = 0;
  fin?.costs?.forEach(c => { if (c.approved) actualRehabCost += c.amount; });
  fin?.inspections?.forEach(i => { actualRehabCost += i.actualCost; });
  deal.rehabExpenses?.forEach(e => { actualRehabCost += e.amount; });

  // ── Buy-Side Acquisition Costs ──────────────────────────────
  let acquisitionCosts = 0;
  if (fin?.loanAmount && fin?.loanOriginationPoints) {
    acquisitionCosts += fin.loanAmount * (fin.loanOriginationPoints / 100);
  }
  if (deal.costBasisLedger) {
    const items = [
      ...(deal.costBasisLedger.directAcquisition || []),
      ...(deal.costBasisLedger.financing || []),
      ...(deal.costBasisLedger.preClosing || []),
    ];
    items.forEach(item => { acquisitionCosts += item.amount; });
  }

  // ── Holding Costs ───────────────────────────────────────────
  let holdingCosts = 0;
  deal.holdingCosts?.forEach(hc => { holdingCosts += hc.monthlyAmount * hc.monthsPaid; });

  // ── Sell-Side Closing Costs + Commissions ───────────────────
  let sellClosingCosts = fin?.finalClosingCosts || 0;
  const buyerCommDollar = grossSalePrice * ((fin?.buyersAgentCommission || 0) / 100);
  const sellerCommDollar = grossSalePrice * ((fin?.sellersAgentCommission || 0) / 100);
  sellClosingCosts += buyerCommDollar + sellerCommDollar;
  deal.exitCosts?.forEach(ec => {
    sellClosingCosts += ec.isPercentage && ec.percentageRate
      ? grossSalePrice * (ec.percentageRate / 100)
      : ec.amount;
  });

  // ── Totals ──────────────────────────────────────────────────
  const totalCostBasis = purchasePrice + actualRehabCost + acquisitionCosts + holdingCosts + sellClosingCosts;
  const loanAmount = fin?.loanAmount || 0;
  const outOfPocketCash = Math.max(0, totalCostBasis - loanAmount);

  // ── Core KPIs ───────────────────────────────────────────────
  const netProfit = grossSalePrice - totalCostBasis;
  const roi = totalCostBasis > 0 ? (netProfit / totalCostBasis) * 100 : 0;
  const coc = outOfPocketCash > 0 ? (netProfit / outOfPocketCash) * 100 : roi;
  const profitMargin = grossSalePrice > 0 ? (netProfit / grossSalePrice) * 100 : 0;

  // ── Time Metrics ────────────────────────────────────────────
  let holdDays: number | null = null;
  let dom: number | null = null;

  if (deal.createdAt && fin?.soldDate) {
    const ms = new Date(fin.soldDate).getTime() - new Date(deal.createdAt).getTime();
    holdDays = Math.max(1, Math.round(ms / 86_400_000));
  }

  if (fin?.listingDate && fin?.soldDate) {
    // Exact DOM from schema dates
    const ms = new Date(fin.soldDate).getTime() - new Date(fin.listingDate).getTime();
    dom = Math.max(0, Math.round(ms / 86_400_000));
  } else if (holdDays !== null) {
    // Estimate: rehab occupies the first portion of the hold, remainder is market time
    const rehabDays = fin?.estimatedTimelineDays || Math.round(holdDays * 0.7);
    dom = Math.max(1, holdDays - rehabDays);
  }

  return {
    grossSalePrice,
    purchasePrice,
    projectedRehabCost,
    actualRehabCost,
    estimatedARV,
    acquisitionCosts,
    holdingCosts,
    sellClosingCosts,
    totalCostBasis,
    loanAmount,
    outOfPocketCash,
    netProfit,
    roi,
    coc,
    profitMargin,
    dom,
    holdDays,
  };
}

/**
 * Computes individual investor disbursements from a waterfall calculation block.
 */
export function calculateEquityPayout(deal: Project | undefined) {
  let isSold = false;
  let targetProfit = 0;
  let calculationStatus = 'No Deal Selected';
  let payouts: { investorId: string; name: string; equityPercentage: number; amount: number }[] = [];

  if (!deal) return { isSold, targetProfit, calculationStatus, payouts };

  if (deal.status === 'Sold') {
    isSold = true;
    const pPrice = deal.financials?.actualSalePrice || 0;
    const buyerComm = pPrice * ((deal.financials?.buyersAgentCommission || 0)/100);
    const sellerComm = pPrice * ((deal.financials?.sellersAgentCommission || 0)/100);
    const cc = deal.financials?.finalClosingCosts || 0;
    const netProceeds = pPrice - buyerComm - sellerComm - cc;

    const basePurchase = deal.financials?.purchasePrice || 0;
    const actualRehabSpend = (deal.financials?.costs || [])
      .filter(c => c.approved)
      .reduce((sum, curr) => sum + curr.amount, 0);

    const totalBurden = basePurchase + actualRehabSpend;
    targetProfit = netProceeds - totalBurden;
    calculationStatus = targetProfit >= 0 ? 'REALIZED PROFIT' : 'REALIZED LOSS';
  } else {
    isSold = false;
    const basePurchase = deal.financials?.purchasePrice || 0;
    const baseRehab = deal.rehab?.baseBudget || 0;
    const arv = deal.financials?.estimatedARV || 0;
    targetProfit = arv - (basePurchase + baseRehab);
    calculationStatus = 'PROJECTED PROFIT';
  }

  const investors = deal.fractionalInvestors || [];
  payouts = investors.map(inv => ({
    investorId: inv.id,
    name: inv.name,
    equityPercentage: inv.equityPercentage,
    amount: Math.max(0, targetProfit * (inv.equityPercentage / 100))
  }));

  return { isSold, targetProfit, calculationStatus, payouts, investors };
}

// ─── Phase 4 Exit Dashboard Calculators ──────────────────────

import type { SettlementLineItem, ProratedEscrowItem, TaxEstimate } from '@/types/schema';

/**
 * Generates pre-populated settlement line items with industry-standard
 * percentage defaults. Used when no saved settlement data exists.
 */
export function computeSettlementDefaults(salePrice: number): SettlementLineItem[] {
  const pct = (rate: number) => salePrice * (rate / 100);
  return [
    {
      id: 'sl-listing-agent',
      label: 'Listing Agent Commission',
      category: 'Commission',
      isPercentage: true,
      percentageRate: 3,
      computedAmount: pct(3),
      paidBy: 'Seller',
      locked: false,
    },
    {
      id: 'sl-buyer-agent',
      label: 'Buyer Agent Commission',
      category: 'Commission',
      isPercentage: true,
      percentageRate: 3,
      computedAmount: pct(3),
      paidBy: 'Seller',
      locked: false,
    },
    {
      id: 'sl-title-insurance',
      label: 'Title Insurance',
      category: 'Title',
      isPercentage: true,
      percentageRate: 0.5,
      computedAmount: pct(0.5),
      paidBy: 'Seller',
      locked: false,
    },
    {
      id: 'sl-transfer-tax',
      label: 'Transfer / Conveyance Tax',
      category: 'Transfer Tax',
      isPercentage: true,
      percentageRate: 0.5,
      computedAmount: pct(0.5),
      paidBy: 'Split',
      locked: false,
    },
    {
      id: 'sl-attorney',
      label: 'Attorney / Legal Fees',
      category: 'Attorney',
      isPercentage: false,
      flatAmount: 1500,
      computedAmount: 1500,
      paidBy: 'Seller',
      locked: false,
    },
    {
      id: 'sl-recording',
      label: 'Recording Fees',
      category: 'Recording',
      isPercentage: false,
      flatAmount: 250,
      computedAmount: 250,
      paidBy: 'Buyer',
      locked: false,
    },
    {
      id: 'sl-escrow',
      label: 'Escrow / Settlement Fee',
      category: 'Escrow',
      isPercentage: false,
      flatAmount: 1200,
      computedAmount: 1200,
      paidBy: 'Split',
      locked: false,
    },
  ];
}

/**
 * Recalculates settlement line item amounts based on a new sale price.
 */
export function recomputeSettlement(items: SettlementLineItem[], salePrice: number): SettlementLineItem[] {
  return items.map(item => ({
    ...item,
    computedAmount: item.isPercentage && item.percentageRate != null
      ? salePrice * (item.percentageRate / 100)
      : item.flatAmount ?? item.computedAmount,
  }));
}

/**
 * Calculates prorated escrow credits based on closing date position in the year.
 * sellerDays = days from Jan 1 (or last billing period) to closing.
 */
export function computeProratedEscrow(
  closingDate: Date,
  items: ProratedEscrowItem[]
): ProratedEscrowItem[] {
  const yearStart = new Date(closingDate.getFullYear(), 0, 1);
  const dayOfYear = Math.ceil(
    (closingDate.getTime() - yearStart.getTime()) / 86_400_000
  );

  return items.map(item => {
    const dailyRate = item.annualAmount / 365;
    const sellerDays = dayOfYear;
    const sellerCredit = Math.round(dailyRate * sellerDays * 100) / 100;
    const buyerCredit = Math.round((item.annualAmount - sellerCredit) * 100) / 100;
    return { ...item, dailyRate, sellerDays, sellerCredit, buyerCredit };
  });
}

/**
 * Estimates capital gains tax for a sold property.
 * Short-term (≤365 days) → user's marginal bracket (default 32%).
 * Long-term (>365 days) → 15% (≤$492,300 income) or 20%.
 */
export function computeCapitalGainsTax(deal: Project): TaxEstimate {
  const fin = deal.financials;
  const salePrice = fin?.actualSalePrice || fin?.estimatedARV || 0;
  const purchasePrice = fin?.purchasePrice || 0;

  // Cost basis = purchase + rehab + acquisition costs
  let rehabCosts = 0;
  fin?.costs?.forEach(c => { if (c.approved) rehabCosts += c.amount; });
  deal.rehabExpenses?.forEach(e => { rehabCosts += e.amount; });

  let acquisitionCosts = 0;
  if (fin?.loanAmount && fin?.loanOriginationPoints) {
    acquisitionCosts += fin.loanAmount * (fin.loanOriginationPoints / 100);
  }
  if (deal.costBasisLedger) {
    [...(deal.costBasisLedger.directAcquisition || []),
     ...(deal.costBasisLedger.financing || []),
     ...(deal.costBasisLedger.preClosing || [])
    ].forEach(item => { acquisitionCosts += item.amount; });
  }

  let holdingCosts = 0;
  deal.holdingCosts?.forEach(hc => { holdingCosts += hc.monthlyAmount * hc.monthsPaid; });

  const costBasis = purchasePrice + rehabCosts + acquisitionCosts + holdingCosts;

  // Sell-side costs (commissions + closing)
  let sellCosts = fin?.finalClosingCosts || 0;
  const buyerComm = salePrice * ((fin?.buyersAgentCommission || 0) / 100);
  const sellerComm = salePrice * ((fin?.sellersAgentCommission || 0) / 100);
  sellCosts += buyerComm + sellerComm;

  // Settlement ledger costs
  fin?.settlementLedger?.forEach(item => {
    if (item.paidBy === 'Seller' || item.paidBy === 'Split') {
      const amount = item.paidBy === 'Split' ? item.computedAmount / 2 : item.computedAmount;
      sellCosts += amount;
    }
  });

  const netProceeds = salePrice - sellCosts;
  const capitalGain = netProceeds - costBasis;

  // Holding period
  let holdingPeriodDays = fin?.estimatedTimelineDays || 90;
  if (deal.createdAt && fin?.soldDate) {
    const ms = new Date(fin.soldDate).getTime() - new Date(deal.createdAt).getTime();
    holdingPeriodDays = Math.max(1, Math.round(ms / 86_400_000));
  }

  const isLongTerm = holdingPeriodDays > 365;
  const marginalRate = fin?.marginalTaxBracket || 32;
  const estimatedTaxRate = isLongTerm ? 15 : marginalRate;
  const estimatedTaxLiability = capitalGain > 0 ? capitalGain * (estimatedTaxRate / 100) : 0;
  const netAfterTax = capitalGain - estimatedTaxLiability;

  return {
    holdingPeriodDays,
    isLongTerm,
    costBasis,
    netProceeds,
    capitalGain,
    estimatedTaxRate,
    estimatedTaxLiability,
    netAfterTax,
  };
}
