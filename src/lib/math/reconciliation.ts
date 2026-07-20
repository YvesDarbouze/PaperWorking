import type { Project } from '@/types/schema';

export interface ReconciliationResult {
  // Uses
  purchasePrice: number;
  closingCosts: number;
  prepaidsReserves: number;
  totalUses: number;

  // Sources
  confirmedEquity: number;
  lockedDebt: number;
  earnestMoneyCredit: number;
  totalSources: number;

  // Variance & Flags
  variance: number;
  isReconciled: boolean;
  isOver: boolean;
  isUnder: boolean;
}

/**
 * Live capital reconciliation engine for closing room validation.
 * Computes: Sources = Confirmed Equity + Locked Debt + Earnest Money Credit
 * Computes: Uses = Purchase Price + Final Closing Costs + Final Prepaids/Reserves
 * Returns variance and validation flags.
 */
export function reconcileProjectCapital(project: Project): ReconciliationResult {
  const fin = project.financials || {};
  
  // 1. Calculate Uses
  const purchasePrice = fin.purchasePrice || 0;
  const closingCosts = fin.finalClosingCosts !== undefined && fin.finalClosingCosts !== null
    ? fin.finalClosingCosts
    : (fin.closingCosts || 0);
  const prepaidsReserves = fin.finalPrepaidsReserves !== undefined && fin.finalPrepaidsReserves !== null
    ? fin.finalPrepaidsReserves
    : Math.round((purchasePrice * 0.005 / 12) + ((purchasePrice * 0.0125 / 12) * 3));
  const totalUses = purchasePrice + closingCosts + prepaidsReserves;

  // 2. Calculate Earnest Money Credit
  // emdAmount is in cents, convert to dollars
  const earnestMoneyCredit = fin.emdAmount 
    ? fin.emdAmount / 100 
    : (fin.loiEarnestAmount ? fin.loiEarnestAmount / 100 : 0);

  // 3. Calculate Locked Debt & Confirmed Equity from Capital Stack
  let lockedDebt = 0;
  let confirmedEquity = 0;

  const stack = fin.capitalStack || [];
  stack.forEach((source) => {
    const isApprovedOrFunded = source.status === 'Approved' || source.status === 'Funded';
    if (isApprovedOrFunded) {
      const isDebt = [
        'Conventional Financing',
        'Hard Money Loans',
        'SBA 504 Bank First Lien',
        'SBA 504 CDC Debenture',
        'Bridge Loans'
      ].includes(source.category);

      const isEquity = [
        'Private Money',
        'Borrower Injection',
        'Co-buying Equity',
        'Syndication Equity',
        'GP Co-investment'
      ].includes(source.category);

      if (isDebt) {
        lockedDebt += source.amount || 0;
      } else if (isEquity) {
        confirmedEquity += source.amount || 0;
      }
    }
  });

  // 4. Calculate Confirmed Equity from Fractional Investors
  const fractional = project.fractionalInvestors || [];
  fractional.forEach((inv) => {
    if (inv.status === 'confirmed') {
      confirmedEquity += inv.contributionAmount || 0;
    }
  });

  const totalSources = confirmedEquity + lockedDebt + earnestMoneyCredit;
  const variance = totalSources - totalUses;

  // Round values to 2 decimal places to avoid floating-point inaccuracies
  const roundedVariance = Math.round(variance * 100) / 100;
  const isReconciled = roundedVariance === 0;

  return {
    purchasePrice,
    closingCosts,
    prepaidsReserves,
    totalUses,
    confirmedEquity,
    lockedDebt,
    earnestMoneyCredit,
    totalSources,
    variance: roundedVariance,
    isReconciled,
    isOver: roundedVariance > 0,
    isUnder: roundedVariance < 0,
  };
}
