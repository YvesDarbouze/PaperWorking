import { Project, PendingReceipt } from '@/types/schema';

/**
 * Validates if an expected receipt approval violates the 15% contingency 
 * enforcement buffer placed on top of the original planned rehab budget.
 */
export function verifyContingencyBuffer(deal: Project, receiptToApprove: { amount: number }): {
   canApprove: boolean;
   rehabBudgetBase: number;
   rehabBudgetBuffered: number;
   currentApprovedTotal: number;
   projectedTotal: number;
   exceedsBy: number;
} {
  const rehab = deal.rehab;
  
  const rehabBudgetBase = rehab?.baseBudget || 0;
  const contingencyBufferPct = rehab?.contingencyBufferPercentage || 0.15; // 15% default
  
  const rehabBudgetBuffered = rehabBudgetBase * (1 + contingencyBufferPct);
  
  // Find all approved costs in the ledger that map to rehab 
  // (In a real system, you might tag CostEntry with a type='rehab')
  // We'll calculate conservatively treating all approved costs as consuming the budget, 
  // or specifically costs that don't match acquiring/holding logic.
  const currentApprovedTotal = deal.financials.costs
    .filter(c => c.approved)
    .reduce((sum, cost) => sum + cost.amount, 0);

  const projectedTotal = currentApprovedTotal + receiptToApprove.amount;

  const canApprove = projectedTotal <= rehabBudgetBuffered;
  const exceedsBy = projectedTotal - rehabBudgetBuffered;

  return {
    canApprove,
    rehabBudgetBase,
    rehabBudgetBuffered,
    currentApprovedTotal,
    projectedTotal,
    exceedsBy: Math.max(0, exceedsBy)
  };
}
