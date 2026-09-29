'use client';

import React from 'react';
import type { ReconciledUnderwritingMetrics } from '@paperworking/financial-engine';
import type { InvestmentStrategyType } from './StrategySelectorBar';

interface StrategyOutputsCardProps {
  strategy: InvestmentStrategyType;
  calculations: ReconciledUnderwritingMetrics;
}

export default function StrategyOutputsCard({
  strategy,
  calculations,
}: StrategyOutputsCardProps) {
  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatPct = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    return `${val.toFixed(1)}%`;
  };

  if (strategy === 'short_term_rental_airbnb' && calculations.shortTermRental) {
    const str = calculations.shortTermRental;
    return (
      <div
        data-testid="str-outputs-card"
        className="rounded-lg border border-border bg-card p-5 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-foreground">
              hotel
            </span>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Short-Term Rental Performance (Airbnb)
            </h3>
          </div>
          <span className="rounded-md bg-muted border border-border px-2 py-0.5 text-[10px] font-mono text-foreground">
            {str.bookedNightsYear} Booked Nights/Yr
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center">
          <div className="rounded-md border border-border bg-muted/40 p-3">
            <span className="block text-[9.5px] uppercase text-muted-foreground">Gross Revenue</span>
            <span className="block text-base font-semibold text-foreground">
              {formatCurrency(str.grossAnnualRevenue)}/yr
            </span>
            <span className="text-[10px] text-muted-foreground">{formatCurrency(str.monthlyAverageGrossRevenue)}/mo</span>
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-3">
            <span className="block text-[9.5px] uppercase text-muted-foreground">STR NOI</span>
            <span className="block text-base font-semibold text-foreground">
              {formatCurrency(str.netOperatingIncome)}/yr
            </span>
            <span className="text-[10px] text-muted-foreground">{str.expenseRatioPct}% OpEx</span>
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-3">
            <span className="block text-[9.5px] uppercase text-muted-foreground">Net Cash Flow</span>
            <span className={`block text-base font-semibold ${str.annualNetCashFlow >= 0 ? 'text-foreground' : 'text-destructive'}`}>
              {formatCurrency(str.annualNetCashFlow)}/yr
            </span>
            <span className="text-[10px] text-muted-foreground">{formatCurrency(str.monthlyNetCashFlow)}/mo</span>
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-3">
            <span className="block text-[9.5px] uppercase text-muted-foreground">Cash-on-Cash</span>
            <span className="block text-base font-semibold text-foreground">
              {formatPct(str.cashOnCashReturnPct)}
            </span>
            <span className="text-[10px] text-muted-foreground">{formatCurrency(str.totalCashInvested)} invested</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 text-white/70">
          <div className="flex justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
            <span>Platform Fees (Airbnb / VRBO):</span>
            <span className="font-mono font-semibold text-white">{formatCurrency(str.platformFeesAnnual)}/yr</span>
          </div>
          <div className="flex justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
            <span>Turnover Cleaning Costs ({str.estimatedStaysCount} stays):</span>
            <span className="font-mono font-semibold text-white">{formatCurrency(str.cleaningCostsAnnual)}/yr</span>
          </div>
        </div>
      </div>
    );
  }

  if (strategy === 'flip' && calculations.fixAndFlip) {
    const flip = calculations.fixAndFlip;
    return (
      <div
        data-testid="flip-outputs-card"
        className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-5 backdrop-blur-md space-y-4"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-amber-400">
              handyman
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Fix & Flip Profitability & Margin
            </h3>
          </div>
          <span className={`rounded border px-2 py-0.5 text-[10px] font-mono uppercase font-bold ${flip.isProfitable ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-red-500/20 border-red-500/30 text-red-300'}`}>
            {flip.isProfitable ? 'Profitable Flip' : 'Negative Margin'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center">
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <span className="block text-[9.5px] uppercase text-white/40">Net Flip Profit</span>
            <span className={`block text-base font-bold ${flip.netFlipProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(flip.netFlipProfit)}
            </span>
            <span className="text-[10px] text-white/50">{flip.profitMarginOnArvPct}% of ARV</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <span className="block text-[9.5px] uppercase text-white/40">ROI on Cost</span>
            <span className="block text-base font-bold text-amber-300">
              {formatPct(flip.roiOnTotalCostPct)}
            </span>
            <span className="text-[10px] text-white/50">Total basis return</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <span className="block text-[9.5px] uppercase text-white/40">Annualized ROI</span>
            <span className="block text-base font-bold text-emerald-400">
              {formatPct(flip.annualizedRoiPct)}
            </span>
            <span className="text-[10px] text-white/50">Annualized velocity</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <span className="block text-[9.5px] uppercase text-white/40">Total Basis</span>
            <span className="block text-base font-bold text-white">
              {formatCurrency(flip.totalCostBasis)}
            </span>
            <span className="text-[10px] text-white/50">{formatCurrency(flip.totalHoldingCosts)} holding carry</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs pt-1 text-white/70">
          <div className="flex justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
            <span>Debt Carry:</span>
            <span className="font-mono font-semibold text-white">{formatCurrency(flip.holdingCostDebtTotal)}</span>
          </div>
          <div className="flex justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
            <span>Holding Utilities/Tax:</span>
            <span className="font-mono font-semibold text-white">{formatCurrency(flip.holdingCostOperationsTotal)}</span>
          </div>
          <div className="flex justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
            <span>Selling Costs:</span>
            <span className="font-mono font-semibold text-white">{formatCurrency(flip.estimatedSellingCosts)}</span>
          </div>
          <div className="flex justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
            <span>70% Rule MAO:</span>
            <span className="font-mono font-bold text-emerald-400">{formatCurrency(calculations.maximumAllowableOffer70Pct)}</span>
          </div>
        </div>

        {/* Short-Term Capital Gains Tax & After-Tax Profit Breakdown */}
        <div
          data-testid="flip-tax-projection"
          className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-2 text-xs"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <span className="material-symbols-outlined text-[15px] text-amber-400">account_balance</span>
              <span>Short-Term Capital Gains Projection (&lt;12 Month Hold)</span>
            </div>
            <span className="text-[10px] font-mono text-white/50">Ordinary Income Rate: {flip.shortTermTaxRatePct ?? 25}%</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono pt-1">
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
              <span className="block text-[9.5px] uppercase text-white/40">Pre-Tax Net Profit</span>
              <span className={`block font-bold text-xs mt-0.5 ${flip.netFlipProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
                {formatCurrency(flip.netFlipProfit)}
              </span>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
              <span className="block text-[9.5px] uppercase text-white/40">Est. Tax Liability ({flip.shortTermTaxRatePct ?? 25}%)</span>
              <span className="block font-bold text-amber-300 text-xs mt-0.5">
                -{formatCurrency(flip.estimatedShortTermTax ?? 0)}
              </span>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
              <span className="block text-[9.5px] uppercase text-white/40">After-Tax Net Profit</span>
              <span
                data-testid="flip-after-tax-profit"
                className={`block font-bold text-xs mt-0.5 ${(flip.afterTaxNetFlipProfit ?? flip.netFlipProfit) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
              >
                {formatCurrency(flip.afterTaxNetFlipProfit ?? flip.netFlipProfit)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (strategy === 'brrrr' && calculations.brrrr) {
    const brrrr = calculations.brrrr;
    return (
      <div
        data-testid="brrrr-outputs-card"
        className="rounded-2xl border border-cyan-500/30 bg-cyan-500/[0.04] p-5 backdrop-blur-md space-y-4"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-cyan-400">
              cycle
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              BRRRR Cash-Out Refinance Analysis
            </h3>
          </div>
          {brrrr.isPerfectBrrrr ? (
            <span className="rounded bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono uppercase font-bold text-emerald-300">
              Perfect BRRRR (100% Recycled)
            </span>
          ) : (
            <span className="rounded bg-cyan-500/20 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-mono uppercase font-bold text-cyan-300">
              {brrrr.capitalRecoveredPct}% Capital Recovered
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center">
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <span className="block text-[9.5px] uppercase text-white/40">New Refi Loan</span>
            <span className="block text-base font-bold text-white">
              {formatCurrency(brrrr.newRefinanceLoanAmount)}
            </span>
            <span className="text-[10px] text-white/50">{formatCurrency(brrrr.refinanceClosingCostsAmount)} closing costs</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <span className="block text-[9.5px] uppercase text-white/40">Cash-Out Proceeds</span>
            <span className="block text-base font-bold text-emerald-400">
              {formatCurrency(brrrr.cashOutGrossProceeds)}
            </span>
            <span className="text-[10px] text-white/50">Recaptured equity</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <span className="block text-[9.5px] uppercase text-white/40">Net Cash Left in Deal</span>
            <span className={`block text-base font-bold ${brrrr.netCashLeftInDeal === 0 ? 'text-emerald-400' : 'text-cyan-300'}`}>
              {formatCurrency(brrrr.netCashLeftInDeal)}
            </span>
            <span className="text-[10px] text-white/50">From {formatCurrency(brrrr.initialCashRequired)} initial</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <span className="block text-[9.5px] uppercase text-white/40">Post-Refi CoC</span>
            <span className="block text-base font-bold text-emerald-400">
              {brrrr.postRefiCashOnCashReturnPct !== null
                ? formatPct(brrrr.postRefiCashOnCashReturnPct)
                : 'Infinite Return'}
            </span>
            <span className="text-[10px] text-white/50">{formatCurrency(brrrr.postRefiMonthlyNetCashFlow)}/mo</span>
          </div>
        </div>
      </div>
    );
  }

  if (strategy === 'commercial_value_add' && calculations.commercial) {
    const comm = calculations.commercial;
    return (
      <div
        data-testid="commercial-outputs-card"
        className="rounded-2xl border border-indigo-500/30 bg-indigo-500/[0.04] p-5 backdrop-blur-md space-y-4"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-indigo-400">
              apartment
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Commercial & Multi-Family Metrics
            </h3>
          </div>
          <span className="rounded bg-black/40 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-indigo-300">
            Institutional Underwriting
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center">
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <span className="block text-[9.5px] uppercase text-white/40">Debt Coverage (DCR)</span>
            <span className={`block text-base font-bold ${comm.debtCoverageRatio && comm.debtCoverageRatio >= 1.25 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {comm.debtCoverageRatio ? `${comm.debtCoverageRatio.toFixed(2)}x` : 'N/A'}
            </span>
            <span className="text-[10px] text-white/50">Lender Min 1.20x</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <span className="block text-[9.5px] uppercase text-white/40">Debt Yield</span>
            <span className="block text-base font-bold text-indigo-300">
              {comm.debtYieldPct ? formatPct(comm.debtYieldPct) : 'N/A'}
            </span>
            <span className="text-[10px] text-white/50">NOI ÷ Loan Amount</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <span className="block text-[9.5px] uppercase text-white/40">Implied Valuation</span>
            <span className="block text-base font-bold text-emerald-400">
              {formatCurrency(comm.impliedMarketValuation)}
            </span>
            <span className="text-[10px] text-white/50">@ Market Cap</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <span className="block text-[9.5px] uppercase text-white/40">Break-Even Occ</span>
            <span className="block text-base font-bold text-white">
              {comm.breakEvenOccupancyPct ? formatPct(comm.breakEvenOccupancyPct) : 'N/A'}
            </span>
            <span className="text-[10px] text-white/50">Debt + OpEx floor</span>
          </div>
        </div>
      </div>
    );
  }

  if (strategy === 'wholesale' && calculations.wholesaling) {
    const ws = calculations.wholesaling;
    return (
      <div
        data-testid="wholesale-outputs-card"
        className="rounded-2xl border border-purple-500/30 bg-purple-500/[0.04] p-5 backdrop-blur-md space-y-4"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-purple-400">
              sell
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Wholesale Contract & Assignment Analysis
            </h3>
          </div>
          <span className={`rounded border px-2 py-0.5 text-[10px] font-mono uppercase font-bold ${ws.isDealViable ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-amber-500/20 border-amber-500/30 text-amber-300'}`}>
            {ws.isDealViable ? 'Viable Contract Spread' : 'Over Contract MAO'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center">
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <span className="block text-[9.5px] uppercase text-white/40">Buyer MAO (70% Rule)</span>
            <span className="block text-base font-bold text-white">
              {formatCurrency(ws.buyerMaximumAllowableOffer)}
            </span>
            <span className="text-[10px] text-white/50">Target investor ceiling</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <span className="block text-[9.5px] uppercase text-white/40">Max Contract Offer</span>
            <span className="block text-base font-bold text-purple-300">
              {formatCurrency(ws.recommendedMaxContractOffer)}
            </span>
            <span className="text-[10px] text-white/50">MAO minus fee</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <span className="block text-[9.5px] uppercase text-white/40">Net Assignment Fee</span>
            <span className="block text-base font-bold text-emerald-400">
              {formatCurrency(ws.netWholesaleProfit)}
            </span>
            <span className="text-[10px] text-white/50">{ws.spreadPctOfContract}% spread</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <span className="block text-[9.5px] uppercase text-white/40">End Buyer Price</span>
            <span className="block text-base font-bold text-white">
              {formatCurrency(ws.endBuyerPurchasePrice)}
            </span>
            <span className="text-[10px] text-white/50">Assignment total</span>
          </div>
        </div>
      </div>
    );
  }

  if (strategy === 'buy_and_hold_rental') {
    return (
      <div
        data-testid="buy-and-hold-outputs-card"
        className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] p-5 backdrop-blur-md space-y-4"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-emerald-400">
              real_estate_agent
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Buy &amp; Hold Long-Term Rental Performance
            </h3>
          </div>
          <span className="rounded bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono uppercase font-bold text-emerald-300">
            Passive Cash Flow &amp; Wealth Building
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center">
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <span className="block text-[9.5px] uppercase text-white/40">Monthly Cash Flow</span>
            <span className={`block text-base font-bold ${calculations.monthlyNetCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(calculations.monthlyNetCashFlow)}/mo
            </span>
            <span className="text-[10px] text-white/50">{formatCurrency(calculations.annualNetCashFlow)}/yr net</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <span className="block text-[9.5px] uppercase text-white/40">Annual NOI</span>
            <span className="block text-base font-bold text-white">
              {formatCurrency(calculations.netOperatingIncome)}/yr
            </span>
            <span className="text-[10px] text-white/50">{formatCurrency(Math.round(calculations.netOperatingIncome / 12))}/mo operating</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <span className="block text-[9.5px] uppercase text-white/40">Cash-on-Cash</span>
            <span className={`block text-base font-bold ${calculations.cashOnCashReturnPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatPct(calculations.cashOnCashReturnPct)}
            </span>
            <span className="text-[10px] text-white/50">Year-1 Dividend Yield</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <span className="block text-[9.5px] uppercase text-white/40">Cap Rate on Cost</span>
            <span className="block text-base font-bold text-white">
              {formatPct(calculations.capRateOnCost)}
            </span>
            <span className="text-[10px] text-white/50">Unlevered Yield</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1 text-white/70">
          <div className="flex justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
            <span>DSCR Coverage:</span>
            <span className="font-mono font-semibold text-white">
              {calculations.dscr !== null ? `${calculations.dscr.toFixed(2)}x` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
            <span>Gross Rent Multiplier (GRM):</span>
            <span className="font-mono font-semibold text-white">
              {calculations.grossRentMultiplier !== null ? `${calculations.grossRentMultiplier.toFixed(1)}x` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
            <span>Exit Valuation ({calculations.terminalValueLabel}):</span>
            <span className="font-mono font-semibold text-emerald-400">
              {formatCurrency(calculations.estimatedExitValue)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
