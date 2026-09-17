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
export interface DatedIrrRoot {
  ratePct: number;
  npvResidual: number;
}

export type DatedIrrStatus = 'converged' | 'no_sign_change' | 'multiple_roots' | 'non_convergent';

export interface DatedIrrResult {
  irrPct: number | null;
  irrStatus: DatedIrrStatus;
  roots: DatedIrrRoot[];
  cashFlowEvents: CashFlowEvent[];
}

export function computeIRRWithDetails(
  cashFlows: CashFlowEvent[],
  maxIterations = 100,
  precision = 1e-6,
): DatedIrrResult {
  if (!cashFlows || cashFlows.length < 2) {
    return {
      irrPct: null,
      irrStatus: 'no_sign_change',
      roots: [],
      cashFlowEvents: cashFlows || [],
    };
  }

  // Verify at least one negative and one positive cash flow
  const hasNegative = cashFlows.some((cf) => cf.amount < 0);
  const hasPositive = cashFlows.some((cf) => cf.amount > 0);
  if (!hasNegative || !hasPositive) {
    return {
      irrPct: null,
      irrStatus: 'no_sign_change',
      roots: [],
      cashFlowEvents: cashFlows,
    };
  }

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

  // Phase 1: 200-point grid scan over [-0.99, 10.0]
  const gridLow = -0.99;
  const gridHigh = 10.0;
  const gridPoints = 200;
  const gridStep = (gridHigh - gridLow) / gridPoints;
  const intervals: Array<[number, number]> = [];

  let prevRate = gridLow;
  let prevNpv = npv(prevRate);

  for (let i = 1; i <= gridPoints; i++) {
    const currRate = gridLow + i * gridStep;
    const currNpv = npv(currRate);
    if (prevNpv * currNpv <= 0 && isFinite(prevNpv) && isFinite(currNpv)) {
      intervals.push([prevRate, currRate]);
    }
    prevRate = currRate;
    prevNpv = currNpv;
  }

  if (intervals.length === 0) {
    return {
      irrPct: null,
      irrStatus: 'no_sign_change',
      roots: [],
      cashFlowEvents: cashFlows,
    };
  }

  const roots: DatedIrrRoot[] = [];

  for (const [low, high] of intervals) {
    let l = low;
    let h = high;
    let r = (l + h) / 2;
    let found = false;

    for (let i = 0; i < maxIterations; i++) {
      const val = npv(r);
      if (Math.abs(val) < precision) {
        found = true;
        break;
      }
      if (val > 0) l = r;
      else h = r;

      const deriv = dnpv(r);
      let nextR: number;
      if (Math.abs(deriv) > 1e-10) {
        nextR = r - val / deriv;
      } else {
        nextR = (l + h) / 2;
      }

      if (nextR <= l || nextR >= h || isNaN(nextR)) {
        nextR = (l + h) / 2;
      }

      if (Math.abs(nextR - r) < 1e-10) {
        r = nextR;
        found = true;
        break;
      }
      r = nextR;
    }

    if (found || Math.abs(npv(r)) < precision) {
      const residual = Math.abs(npv(r));
      if (residual < 1e-6) {
        roots.push({
          ratePct: Number((r * 100).toFixed(2)),
          npvResidual: residual,
        });
      }
    }
  }

  if (roots.length === 0) {
    return {
      irrPct: null,
      irrStatus: 'non_convergent',
      roots: [],
      cashFlowEvents: cashFlows,
    };
  }

  if (roots.length === 1) {
    return {
      irrPct: roots[0].ratePct,
      irrStatus: 'converged',
      roots,
      cashFlowEvents: cashFlows,
    };
  }

  return {
    irrPct: null,
    irrStatus: 'multiple_roots',
    roots,
    cashFlowEvents: cashFlows,
  };
}

export function computeIRR(
  cashFlows: CashFlowEvent[],
  maxIterations = 100,
  precision = 1e-6,
): number | null {
  return computeIRRWithDetails(cashFlows, maxIterations, precision).irrPct;
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
