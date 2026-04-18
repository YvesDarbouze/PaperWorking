import { Project, FractionalInvestor } from '@/types/schema';

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
