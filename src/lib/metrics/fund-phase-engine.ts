export interface EquityInvestor {
  id: string;
  name: string;
  capitalContributed: number;
  ownershipPct: number;
  isGP?: boolean;
}

export interface WaterfallTier {
  hurdleIrrPct: number;
  lpSplitPct: number;
  gpSplitPct: number;
}

export interface CashFlowEvent {
  date: string;
  amount: number; // Negative for investment, positive for distribution
}

export interface InvestorDistributionResult {
  investorId: string;
  name: string;
  capitalContributed: number;
  preferredReturnAccrued: number;
  totalDistributed: number;
  equityMultiple: number;
}

export interface FundPhaseResult {
  irr: number | null;
  gpPromoteAmount: number;
  totalPreferredReturnAccrued: number;
  investorResults: InvestorDistributionResult[];
  tierDistributions: Array<{
    tierIndex: number;
    hurdleIrrPct: number;
    totalAmount: number;
    lpAmount: number;
    gpAmount: number;
  }>;
}

/**
 * Calculates Internal Rate of Return (IRR) using Newton-Raphson method with fallback binary search
 */
export function computeIRR(cashFlows: CashFlowEvent[], maxIterations = 100, precision = 1e-6): number | null {
  if (!cashFlows || cashFlows.length < 2) return null;

  // Verify at least one negative and one positive cash flow
  const hasNegative = cashFlows.some(cf => cf.amount < 0);
  const hasPositive = cashFlows.some(cf => cf.amount > 0);
  if (!hasNegative || !hasPositive) return null;

  const baseDate = new Date(cashFlows[0].date).getTime();

  // Helper to compute Net Present Value at rate r
  const npv = (r: number) => {
    return cashFlows.reduce((sum, cf) => {
      const days = (new Date(cf.date).getTime() - baseDate) / (1000 * 60 * 60 * 24);
      const years = days / 365;
      return sum + cf.amount / Math.pow(1 + r, years);
    }, 0);
  };

  // Helper to compute derivative of NPV
  const dnpv = (r: number) => {
    return cashFlows.reduce((sum, cf) => {
      const days = (new Date(cf.date).getTime() - baseDate) / (1000 * 60 * 60 * 24);
      const years = days / 365;
      if (years === 0) return sum;
      return sum - (years * cf.amount) / Math.pow(1 + r, years + 1);
    }, 0);
  };

  // 1. Newton-Raphson Search
  let rate = 0.1; // Initial 10% guess
  for (let i = 0; i < maxIterations; i++) {
    const value = npv(rate);
    if (Math.abs(value) < precision) {
      return Number((rate * 100).toFixed(2));
    }
    const deriv = dnpv(rate);
    if (Math.abs(deriv) < 1e-10) break;
    const newRate = rate - value / deriv;
    if (isNaN(newRate) || !isFinite(newRate)) break;
    rate = newRate;
  }

  // 2. Fallback Bisection Method
  let low = -0.999;
  let high = 5.0;
  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2;
    const midNpv = npv(mid);
    if (Math.abs(midNpv) < precision) {
      return Number((mid * 100).toFixed(2));
    }
    if (midNpv > 0) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return Number((rate * 100).toFixed(2));
}

/**
 * Computes Fund Phase metrics including Preferred Return, Waterfall splits, and GP Promote.
 */
export function computeFundPhaseMetrics(
  equityInvestors: EquityInvestor[],
  preferredReturnRate: number,
  waterfallTiers: WaterfallTier[],
  gpPromotePct: number,
  cashFlows: CashFlowEvent[]
): FundPhaseResult {
  const totalCapitalContributed = equityInvestors.reduce((sum, inv) => sum + inv.capitalContributed, 0);

  // 1. Preferred Return Accrual
  // Calculate holding duration from cash flows or default to 1 year
  let holdingYears = 1;
  if (cashFlows.length >= 2) {
    const startDate = new Date(cashFlows[0].date).getTime();
    const endDate = new Date(cashFlows[cashFlows.length - 1].date).getTime();
    holdingYears = Math.max(0.08, (endDate - startDate) / (1000 * 60 * 60 * 24 * 365));
  }

  const totalPreferredReturnAccrued = Number(
    (totalCapitalContributed * (preferredReturnRate / 100) * holdingYears).toFixed(2)
  );

  // 2. IRR Calculation
  const irr = computeIRR(cashFlows);

  // 3. Distributions and Waterfall
  const positiveCashFlows = cashFlows.filter(cf => cf.amount > 0).reduce((sum, cf) => sum + cf.amount, 0);

  let remainingDistributable = positiveCashFlows;
  let totalGPPromote = 0;

  const tierDistributions: Array<{
    tierIndex: number;
    hurdleIrrPct: number;
    totalAmount: number;
    lpAmount: number;
    gpAmount: number;
  }> = [];

  // Sort tiers by hurdle rate
  const sortedTiers = [...waterfallTiers].sort((a, b) => a.hurdleIrrPct - b.hurdleIrrPct);

  if (sortedTiers.length === 0) {
    // Default 80/20 split if no tiers provided
    sortedTiers.push({ hurdleIrrPct: 8, lpSplitPct: 100 - gpPromotePct, gpSplitPct: gpPromotePct });
  }

  sortedTiers.forEach((tier, index) => {
    if (remainingDistributable <= 0) return;

    // Distribute portion in tier
    const tierAmount = remainingDistributable; // Allocate remaining to current tier
    const lpAmount = Number((tierAmount * (tier.lpSplitPct / 100)).toFixed(2));
    const gpAmount = Number((tierAmount * (tier.gpSplitPct / 100)).toFixed(2));

    tierDistributions.push({
      tierIndex: index + 1,
      hurdleIrrPct: tier.hurdleIrrPct,
      totalAmount: tierAmount,
      lpAmount,
      gpAmount,
    });

    totalGPPromote += gpAmount;
    remainingDistributable = 0;
  });

  // Individual Investor Distribution Allocation
  const investorResults: InvestorDistributionResult[] = equityInvestors.map(inv => {
    const ownershipRatio = totalCapitalContributed > 0 ? inv.capitalContributed / totalCapitalContributed : 0;
    const prefReturn = Number((totalPreferredReturnAccrued * ownershipRatio).toFixed(2));

    // Distribution = Capital Return + Pref Return + Shared Tier Distribution
    const totalDist = Number(
      (inv.capitalContributed + prefReturn + (positiveCashFlows - totalCapitalContributed - totalPreferredReturnAccrued) * ownershipRatio).toFixed(2)
    );

    const equityMultiple =
      inv.capitalContributed > 0
        ? Number((Math.max(0, totalDist) / inv.capitalContributed).toFixed(2))
        : 1.0;

    return {
      investorId: inv.id,
      name: inv.name,
      capitalContributed: inv.capitalContributed,
      preferredReturnAccrued: prefReturn,
      totalDistributed: Math.max(inv.capitalContributed, totalDist),
      equityMultiple,
    };
  });

  return {
    irr,
    gpPromoteAmount: Number(totalGPPromote.toFixed(2)),
    totalPreferredReturnAccrued,
    investorResults,
    tierDistributions,
  };
}
