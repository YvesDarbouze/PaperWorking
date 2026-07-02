import { TaxEstimate } from '@/types/schema';

export function computeGrossProfit(salePrice: number, purchasePrice: number): number {
  return salePrice - purchasePrice;
}

export function computeSaleCommissions(salePrice: number, buyerPct: number, sellerPct: number): number {
  return salePrice * ((buyerPct + sellerPct) / 100);
}

export function computeNetProceeds(
  salePrice: number,
  commissions: number,
  attorneyFees: number,
  closingCosts: number,
  sellingCosts: number,
  sellerConcessions: number = 0,
  otherMarketing: number = 0
): number {
  return salePrice - (commissions + attorneyFees + closingCosts + sellingCosts + sellerConcessions + otherMarketing);
}

export function computeRealizedROI(netProfit: number, totalCashInvested: number): number {
  if (totalCashInvested <= 0) return 0;
  return (netProfit / totalCashInvested) * 100;
}

export function computeOwnerShareReturn(
  netProfit: number, 
  ownershipPct: number, 
  ownerCashInvested: number
): { ownerProfit: number, ownerROI: number, ownerCashBack: number } {
  const fraction = ownershipPct / 100;
  const ownerProfit = netProfit * fraction;
  const ownerCashBack = ownerCashInvested + ownerProfit;
  const ownerROI = ownerCashInvested > 0 ? (ownerProfit / ownerCashInvested) * 100 : 0;
  
  return { ownerProfit, ownerROI, ownerCashBack };
}

export function computeHoldingPeriodDays(acquisitionDate: any, saleDate: any): number {
  if (!acquisitionDate || !saleDate) return 0;
  
  const start = acquisitionDate.toDate ? acquisitionDate.toDate() : new Date(acquisitionDate);
  const end = saleDate.toDate ? saleDate.toDate() : new Date(saleDate);
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function isLongTermHold(holdDays: number): boolean {
  return holdDays > 365;
}

export function computeQuickTaxEstimate(
  costBasis: number, 
  netProceeds: number, 
  holdDays: number, 
  marginalRate: number = 32 // default fallback
): TaxEstimate {
  const capitalGain = Math.max(0, netProceeds - costBasis);
  const isLongTerm = isLongTermHold(holdDays);
  
  // IRS guidelines: Short-term uses ordinary income bracket, Long-term uses capital gains (typically 15% or 20%)
  const effectiveRate = isLongTerm ? 15 : marginalRate; 
  
  const estimatedTaxLiability = capitalGain * (effectiveRate / 100);
  const netAfterTax = capitalGain - estimatedTaxLiability;
  
  return {
    holdingPeriodDays: holdDays,
    isLongTerm,
    costBasis,
    netProceeds,
    capitalGain,
    estimatedTaxRate: effectiveRate,
    estimatedTaxLiability,
    netAfterTax
  };
}

export function computeRefiEquityExtracted(refiLoanAmount: number, existingLoanBalance: number): number {
  return Math.max(0, refiLoanAmount - existingLoanBalance);
}

export function computeRefiNewMonthlyPayment(loanAmount: number, rate: number, termYears: number): number {
  if (loanAmount <= 0 || rate <= 0 || termYears <= 0) return 0;
  const monthlyRate = (rate / 100) / 12;
  const numPayments = termYears * 12;
  
  return (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
         (Math.pow(1 + monthlyRate, numPayments) - 1);
}
