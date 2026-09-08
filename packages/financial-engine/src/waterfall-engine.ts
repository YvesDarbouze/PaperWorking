import { computeIRR, CashFlowEvent } from './fund-phase-engine.js';

export interface WaterfallInputs {
  totalEquity: number;
  lpEquityPct?: number; // default 90%
  gpEquityPct?: number; // default 10%
  preferredReturnPct?: number; // default 8%
  gpPromotePct?: number; // default 20% (LP 80 / GP 20)
  hurdle2Irr?: number; // optional second hurdle (e.g. 15%)
  gpPromote2Pct?: number; // optional second promote (e.g. 30% -> LP 70 / GP 30)
  holdPeriodYears?: number; // default 5
  annualCashFlow?: number; // annual operating cash flow after debt service
  netExitProceeds?: number; // net sales proceeds after debt payoff
}

export interface WaterfallDistributionDetail {
  year: number;
  cashFlowAvailable: number;
  lpDistribution: number;
  gpDistribution: number;
  description: string;
}

export interface WaterfallTierSummary {
  tierNumber: number;
  name: string;
  thresholdDescription: string;
  lpSplitPct: number;
  gpSplitPct: number;
  lpAmount: number;
  gpAmount: number;
  totalAmount: number;
}

export interface WaterfallResult {
  totalEquity: number;
  lpEquity: number;
  gpEquity: number;
  lpEquityPct: number;
  gpEquityPct: number;
  preferredReturnPct: number;
  gpPromotePct: number;
  hurdle2Irr: number | null;
  gpPromote2Pct: number | null;

  lpTotalDistributed: number;
  gpTotalDistributed: number;
  totalDistributed: number;

  lpIrr: number | null;
  gpIrr: number | null;
  lpEquityMultiple: number | null;
  gpEquityMultiple: number | null;

  annualDistributions: WaterfallDistributionDetail[];
  tiers: WaterfallTierSummary[];
}

/**
 * Institutional Real Estate Private Equity Distribution Waterfall.
 *
 * Models standard European-style multi-tier waterfall:
 * 1. Pro-Rata Return of Capital (LP lpEquityPct% / GP gpEquityPct%)
 * 2. Preferred Return to LP at preferredReturnPct%
 * 3. Tier 1 Profit Split: gpPromotePct% to GP / (100 - gpPromotePct)% to LP
 * 4. Tier 2 Profit Split (optional): once LP achieves hurdle2Irr%, excess is split
 *    gpPromote2Pct% to GP / (100 - gpPromote2Pct)% to LP.
 */
export function computeDistributionWaterfall(inputs: WaterfallInputs): WaterfallResult {
  const totalEquity = Math.max(0, inputs.totalEquity);
  const lpEquityPct = inputs.lpEquityPct ?? 90;
  const gpEquityPct = inputs.gpEquityPct ?? 10;
  const preferredReturnPct = inputs.preferredReturnPct ?? 8;
  const gpPromotePct = inputs.gpPromotePct ?? 20;
  const hurdle2Irr = inputs.hurdle2Irr ?? null;
  const gpPromote2Pct = inputs.gpPromote2Pct ?? null;
  const holdPeriodYears = Math.max(1, Math.round(inputs.holdPeriodYears ?? 5));
  const annualCashFlow = inputs.annualCashFlow ?? 0;
  const netExitProceeds = inputs.netExitProceeds ?? 0;

  const lpEquity = Math.round(totalEquity * (lpEquityPct / 100));
  const gpEquity = Math.max(0, totalEquity - lpEquity);

  const annualDistributions: WaterfallDistributionDetail[] = [];
  const lpCashFlowsByYear: number[] = new Array(holdPeriodYears + 1).fill(0);
  const gpCashFlowsByYear: number[] = new Array(holdPeriodYears + 1).fill(0);

  // Year 0: Initial Equity Outflow
  lpCashFlowsByYear[0] = -lpEquity;
  gpCashFlowsByYear[0] = -gpEquity;

  const annualLpPref = lpEquity * (preferredReturnPct / 100);
  const annualGpYield = gpEquity * (preferredReturnPct / 100);
  const totalAnnualPref = annualLpPref + annualGpYield;

  let accruedUnpaidLpPref = 0;
  let accruedUnpaidGpYield = 0;

  // ── 1. Operating Years (Years 1 to HoldPeriod - 1) ───────────────────────
  for (let yr = 1; yr < holdPeriodYears; yr++) {
    const available = annualCashFlow;
    let lpDist = 0;
    let gpDist = 0;

    if (available > 0) {
      if (available >= totalAnnualPref) {
        // Full pref paid
        lpDist = annualLpPref;
        gpDist = annualGpYield;
        const excess = available - totalAnnualPref;
        // Excess operating cash flow distributed pro rata
        lpDist += excess * (lpEquityPct / 100);
        gpDist += excess * (gpEquityPct / 100);
      } else {
        // Partial pref distributed pro rata
        lpDist = available * (lpEquityPct / 100);
        gpDist = available * (gpEquityPct / 100);
        accruedUnpaidLpPref += Math.max(0, annualLpPref - lpDist);
        accruedUnpaidGpYield += Math.max(0, annualGpYield - gpDist);
      }
    } else {
      accruedUnpaidLpPref += annualLpPref;
      accruedUnpaidGpYield += annualGpYield;
    }

    annualDistributions.push({
      year: yr,
      cashFlowAvailable: available,
      lpDistribution: Math.round(lpDist),
      gpDistribution: Math.round(gpDist),
      description: `Year ${yr} Operating Cash Flow Distribution`,
    });

    lpCashFlowsByYear[yr] = lpDist;
    gpCashFlowsByYear[yr] = gpDist;
  }

  // ── 2. Exit Year (Year H) ────────────────────────────────────────────────
  const exitCashAvailable = annualCashFlow + netExitProceeds;
  let remainingExitCash = exitCashAvailable;

  // Step 2a: Preferred Return for Exit Year + Any Accrued Unpaid Pref
  const finalYearLpPref = annualLpPref + accruedUnpaidLpPref;
  const finalYearGpYield = annualGpYield + accruedUnpaidGpYield;
  const totalExitPrefObligation = finalYearLpPref + finalYearGpYield;

  let exitLpPrefPaid = 0;
  let exitGpYieldPaid = 0;

  if (remainingExitCash > 0) {
    if (remainingExitCash >= totalExitPrefObligation) {
      exitLpPrefPaid = finalYearLpPref;
      exitGpYieldPaid = finalYearGpYield;
      remainingExitCash -= totalExitPrefObligation;
    } else {
      exitLpPrefPaid = remainingExitCash * (lpEquityPct / 100);
      exitGpYieldPaid = remainingExitCash * (gpEquityPct / 100);
      remainingExitCash = 0;
    }
  }

  // Step 2b: Return of Capital (pro rata)
  let capitalReturnedLp = 0;
  let capitalReturnedGp = 0;

  if (remainingExitCash > 0) {
    if (remainingExitCash >= totalEquity) {
      capitalReturnedLp = lpEquity;
      capitalReturnedGp = gpEquity;
      remainingExitCash -= totalEquity;
    } else {
      capitalReturnedLp = remainingExitCash * (lpEquityPct / 100);
      capitalReturnedGp = remainingExitCash * (gpEquityPct / 100);
      remainingExitCash = 0;
    }
  }

  // Step 2c: Remaining Profit Split (Promote Structure)
  let tier1LpProfit = 0;
  let tier1GpProfit = 0;
  let tier2LpProfit = 0;
  let tier2GpProfit = 0;

  const lpSplitTier1 = (100 - gpPromotePct) / 100; // e.g. 80%
  const gpSplitTier1 = gpPromotePct / 100; // e.g. 20%

  if (remainingExitCash > 0) {
    const hasTier2 = hurdle2Irr !== null && gpPromote2Pct !== null && gpPromote2Pct > gpPromotePct;

    if (!hasTier2) {
      // Single Promote Tier
      tier1LpProfit = remainingExitCash * lpSplitTier1;
      tier1GpProfit = remainingExitCash * gpSplitTier1;
    } else {
      // Two-Tier Promote Waterfall
      // Determine LP exit distribution needed to achieve hurdle2Irr exactly
      // At hurdle2Irr r = hurdle2Irr / 100:
      // NPV = -lpEquity + sum_{y=1}^{H-1} (lpCashFlowsByYear[y] / (1+r)^y) + (finalExitLpCash / (1+r)^H) = 0
      const r = (hurdle2Irr as number) / 100;
      let pvPriorYears = 0;
      for (let y = 1; y < holdPeriodYears; y++) {
        pvPriorYears += lpCashFlowsByYear[y] / Math.pow(1 + r, y);
      }
      const pvNeededAtExit = lpEquity - pvPriorYears;
      const targetExitLpCash = pvNeededAtExit * Math.pow(1 + r, holdPeriodYears);
      const guaranteedExitLpCash = exitLpPrefPaid + capitalReturnedLp;
      const lpProfitNeededForHurdle2 = Math.max(0, targetExitLpCash - guaranteedExitLpCash);

      // In Tier 1, LP gets lpSplitTier1 share of profit
      const totalTier1ProfitThreshold = lpProfitNeededForHurdle2 / lpSplitTier1;

      if (remainingExitCash <= totalTier1ProfitThreshold) {
        // Profit does not exceed Tier 2 hurdle
        tier1LpProfit = remainingExitCash * lpSplitTier1;
        tier1GpProfit = remainingExitCash * gpSplitTier1;
      } else {
        // Profit exceeds Tier 2 hurdle: allocate max to Tier 1, rest to Tier 2
        tier1LpProfit = lpProfitNeededForHurdle2;
        tier1GpProfit = totalTier1ProfitThreshold - lpProfitNeededForHurdle2;

        const excessProfit = remainingExitCash - totalTier1ProfitThreshold;
        const lpSplitTier2 = (100 - (gpPromote2Pct as number)) / 100;
        const gpSplitTier2 = (gpPromote2Pct as number) / 100;

        tier2LpProfit = excessProfit * lpSplitTier2;
        tier2GpProfit = excessProfit * gpSplitTier2;
      }
    }
  }

  const finalYearLpTotal = exitLpPrefPaid + capitalReturnedLp + tier1LpProfit + tier2LpProfit;
  const finalYearGpTotal = exitGpYieldPaid + capitalReturnedGp + tier1GpProfit + tier2GpProfit;

  lpCashFlowsByYear[holdPeriodYears] = finalYearLpTotal;
  gpCashFlowsByYear[holdPeriodYears] = finalYearGpTotal;

  annualDistributions.push({
    year: holdPeriodYears,
    cashFlowAvailable: exitCashAvailable,
    lpDistribution: Math.round(finalYearLpTotal),
    gpDistribution: Math.round(finalYearGpTotal),
    description: `Year ${holdPeriodYears} Exit Proceeds & Final Distribution`,
  });

  // ── 3. IRR & Return Metrics ──────────────────────────────────────────────
  const baseYear = 2025;
  const lpEvents: CashFlowEvent[] = lpCashFlowsByYear.map((amt, idx) => ({
    date: `${baseYear + idx}-01-01`,
    amount: amt,
  }));
  const gpEvents: CashFlowEvent[] = gpCashFlowsByYear.map((amt, idx) => ({
    date: `${baseYear + idx}-01-01`,
    amount: amt,
  }));

  const lpIrr = lpEquity > 0 ? computeIRR(lpEvents) : null;
  const gpIrr = gpEquity > 0 ? computeIRR(gpEvents) : null;

  const lpTotalDistributed = lpCashFlowsByYear.slice(1).reduce((sum, v) => sum + v, 0);
  const gpTotalDistributed = gpCashFlowsByYear.slice(1).reduce((sum, v) => sum + v, 0);
  const totalDistributed = lpTotalDistributed + gpTotalDistributed;

  const lpEquityMultiple = lpEquity > 0 ? Number((lpTotalDistributed / lpEquity).toFixed(2)) : null;
  const gpEquityMultiple = gpEquity > 0 ? Number((gpTotalDistributed / gpEquity).toFixed(2)) : null;

  // ── 4. Tier Summaries for UI Modal ───────────────────────────────────────
  const tiers: WaterfallTierSummary[] = [
    {
      tierNumber: 1,
      name: 'Return of Capital',
      thresholdDescription: '100% Return of Initial Contributed Equity',
      lpSplitPct: lpEquityPct,
      gpSplitPct: gpEquityPct,
      lpAmount: Math.round(capitalReturnedLp),
      gpAmount: Math.round(capitalReturnedGp),
      totalAmount: Math.round(capitalReturnedLp + capitalReturnedGp),
    },
    {
      tierNumber: 2,
      name: `Preferred Return (${preferredReturnPct}%)`,
      thresholdDescription: `${preferredReturnPct}% Annual Uncompounded Hurdle`,
      lpSplitPct: lpEquityPct,
      gpSplitPct: gpEquityPct,
      lpAmount: Math.round(annualDistributions.reduce((s, d, idx) => s + (idx < holdPeriodYears - 1 ? d.lpDistribution : exitLpPrefPaid), 0)),
      gpAmount: Math.round(annualDistributions.reduce((s, d, idx) => s + (idx < holdPeriodYears - 1 ? d.gpDistribution : exitGpYieldPaid), 0)),
      totalAmount: Math.round(annualDistributions.reduce((s, d, idx) => s + (idx < holdPeriodYears - 1 ? (d.lpDistribution + d.gpDistribution) : (exitLpPrefPaid + exitGpYieldPaid)), 0)),
    },
    {
      tierNumber: 3,
      name: `Tier 1 Promote (${gpPromotePct}% GP)`,
      thresholdDescription: hurdle2Irr ? `Up to ${hurdle2Irr}% LP IRR Hurdle` : 'All Residual Profits Above Pref',
      lpSplitPct: 100 - gpPromotePct,
      gpSplitPct: gpPromotePct,
      lpAmount: Math.round(tier1LpProfit),
      gpAmount: Math.round(tier1GpProfit),
      totalAmount: Math.round(tier1LpProfit + tier1GpProfit),
    },
  ];

  if (hurdle2Irr !== null && gpPromote2Pct !== null) {
    tiers.push({
      tierNumber: 4,
      name: `Tier 2 Promote (${gpPromote2Pct}% GP)`,
      thresholdDescription: `Profits Exceeding ${hurdle2Irr}% LP IRR`,
      lpSplitPct: 100 - gpPromote2Pct,
      gpSplitPct: gpPromote2Pct,
      lpAmount: Math.round(tier2LpProfit),
      gpAmount: Math.round(tier2GpProfit),
      totalAmount: Math.round(tier2LpProfit + tier2GpProfit),
    });
  }

  return {
    totalEquity: Math.round(totalEquity),
    lpEquity: Math.round(lpEquity),
    gpEquity: Math.round(gpEquity),
    lpEquityPct,
    gpEquityPct,
    preferredReturnPct,
    gpPromotePct,
    hurdle2Irr,
    gpPromote2Pct,
    lpTotalDistributed: Math.round(lpTotalDistributed),
    gpTotalDistributed: Math.round(gpTotalDistributed),
    totalDistributed: Math.round(totalDistributed),
    lpIrr,
    gpIrr,
    lpEquityMultiple,
    gpEquityMultiple,
    annualDistributions,
    tiers,
  };
}
