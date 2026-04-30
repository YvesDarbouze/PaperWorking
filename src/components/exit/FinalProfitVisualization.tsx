'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import { computeAutopsyMetrics } from '@/lib/math/calculatorUtils';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Final Profit Visualization
   
   Renders the ultimate financial outcome of a sold or to-be-sold
   project. Aggregates "All-In Cost" and visualizes the
   net profit as the largest typographical element, supported
   by a clean, thin-line proportional stacked bar chart.
   ═══════════════════════════════════════════════════════ */

interface FinalProfitVisualizationProps {
  deal: Project;
}

export default function FinalProfitVisualization({ deal }: FinalProfitVisualizationProps) {
  const metrics = useMemo(() => computeAutopsyMetrics(deal), [deal]);

  const allInCost = metrics.totalCostBasis;
  const finalSalePrice = metrics.grossSalePrice;
  const netProfit = metrics.netProfit;
  const isProfit = netProfit >= 0;

  // For visual proportioning:
  // If sale price > all in cost, the full bar is sale price.
  // If sale price < all in cost, the full bar is all in cost.
  const maxBarValue = Math.max(finalSalePrice, allInCost);

  // Percentages for the thin-line bar chart
  const pctPurchase = maxBarValue > 0 ? (metrics.purchasePrice / maxBarValue) * 100 : 0;
  const pctAcquisition = maxBarValue > 0 ? (metrics.acquisitionCosts / maxBarValue) * 100 : 0;
  const pctRehab = maxBarValue > 0 ? (metrics.actualRehabCost / maxBarValue) * 100 : 0;
  const pctHolding = maxBarValue > 0 ? (metrics.holdingCosts / maxBarValue) * 100 : 0;
  const pctSelling = maxBarValue > 0 ? (metrics.sellClosingCosts / maxBarValue) * 100 : 0;
  const pctProfit = maxBarValue > 0 && isProfit ? (netProfit / maxBarValue) * 100 : 0;
  const pctLoss = maxBarValue > 0 && !isProfit ? (Math.abs(netProfit) / maxBarValue) * 100 : 0;

  const fmtCurrency = (val: number) => {
    return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const fmtPercent = (val: number) => {
    return val.toFixed(1) + '%';
  };

  return (
    <div className="bg-bg-surface border border-pw-black rounded-lg overflow-hidden shadow-sm">
      {/* ── Banner Header ── */}
      <div className="bg-pw-black px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-pw-white">
          <Activity className="w-5 h-5" />
          <h2 className="text-sm font-black uppercase tracking-[0.2em]">Final Project Outcome</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.15em]">
            Margin: {fmtPercent(metrics.profitMargin)}
          </span>
        </div>
      </div>

      {/* ── Hero Net Profit Display ── */}
      <div className={`p-10 flex flex-col items-center justify-center border-b border-border-subtle ${isProfit ? 'bg-gradient-to-b from-green-50/50 to-transparent' : 'bg-gradient-to-b from-red-50/50 to-transparent'}`}>
        <p className="text-xs font-black text-text-secondary uppercase tracking-[0.3em] mb-2">Net Profit Output</p>
        <div className="flex items-center justify-center gap-4">
          {isProfit ? (
            <TrendingUp className="w-10 h-10 text-green-600" />
          ) : (
            <TrendingDown className="w-10 h-10 text-red-600" />
          )}
          <h1 className={`text-6xl md:text-8xl font-black font-mono tracking-tighter ${isProfit ? 'text-green-700' : 'text-red-700'}`}>
            {fmtCurrency(netProfit)}
          </h1>
        </div>
        
        <div className="flex items-center gap-8 mt-8">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Final Sale Price</span>
            <span className="text-xl font-black text-text-primary font-mono">{fmtCurrency(finalSalePrice)}</span>
          </div>
          <div className="h-8 w-px bg-border-subtle" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">All-In Cost</span>
            <span className="text-xl font-black text-text-primary font-mono">{fmtCurrency(allInCost)}</span>
          </div>
        </div>
      </div>

      {/* ── Thin-Line Bar Chart ── */}
      <div className="p-8">
        <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-4">Capital Stack & Profit Visualization</h3>
        
        <div className="relative h-4 w-full bg-border-subtle rounded-full overflow-hidden flex mb-6 shadow-inner">
          {/* Stacked segments for All-In Cost */}
          {pctPurchase > 0 && <div className="h-full bg-gray-300 transition-all duration-500" style={{ width: `${pctPurchase}%` }} title={`Purchase: ${fmtCurrency(metrics.purchasePrice)}`} />}
          {pctAcquisition > 0 && <div className="h-full bg-gray-400 transition-all duration-500" style={{ width: `${pctAcquisition}%` }} title={`Acq: ${fmtCurrency(metrics.acquisitionCosts)}`} />}
          {pctRehab > 0 && <div className="h-full bg-gray-500 transition-all duration-500" style={{ width: `${pctRehab}%` }} title={`Rehab: ${fmtCurrency(metrics.actualRehabCost)}`} />}
          {pctHolding > 0 && <div className="h-full bg-gray-600 transition-all duration-500" style={{ width: `${pctHolding}%` }} title={`Holding: ${fmtCurrency(metrics.holdingCosts)}`} />}
          {pctSelling > 0 && <div className="h-full bg-gray-800 transition-all duration-500" style={{ width: `${pctSelling}%` }} title={`Marketing/Selling: ${fmtCurrency(metrics.sellClosingCosts)}`} />}
          
          {/* Net Profit Segment (if profit) */}
          {isProfit && pctProfit > 0 && (
            <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${pctProfit}%` }} title={`Net Profit: ${fmtCurrency(netProfit)}`} />
          )}
          {/* Net Loss Segment (if loss, it overlays or replaces part of the bar conceptually, but for simplicity we append it in red) */}
          {!isProfit && pctLoss > 0 && (
            <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${pctLoss}%` }} title={`Net Loss: ${fmtCurrency(netProfit)}`} />
          )}
        </div>

        {/* Legend Grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="flex flex-col gap-1 border-l-2 border-gray-300 pl-3">
            <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Purchase</span>
            <span className="text-sm font-bold font-mono text-text-primary">{fmtCurrency(metrics.purchasePrice)}</span>
          </div>
          <div className="flex flex-col gap-1 border-l-2 border-gray-400 pl-3">
            <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Acquisition</span>
            <span className="text-sm font-bold font-mono text-text-primary">{fmtCurrency(metrics.acquisitionCosts)}</span>
          </div>
          <div className="flex flex-col gap-1 border-l-2 border-gray-500 pl-3">
            <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Rehab</span>
            <span className="text-sm font-bold font-mono text-text-primary">{fmtCurrency(metrics.actualRehabCost)}</span>
          </div>
          <div className="flex flex-col gap-1 border-l-2 border-gray-600 pl-3">
            <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Holding</span>
            <span className="text-sm font-bold font-mono text-text-primary">{fmtCurrency(metrics.holdingCosts)}</span>
          </div>
          <div className="flex flex-col gap-1 border-l-2 border-gray-800 pl-3">
            <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Selling</span>
            <span className="text-sm font-bold font-mono text-text-primary">{fmtCurrency(metrics.sellClosingCosts)}</span>
          </div>
          <div className={`flex flex-col gap-1 border-l-2 pl-3 ${isProfit ? 'border-green-500' : 'border-red-500'}`}>
            <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{isProfit ? 'Net Profit' : 'Net Loss'}</span>
            <span className={`text-sm font-bold font-mono ${isProfit ? 'text-green-600' : 'text-red-600'}`}>{fmtCurrency(netProfit)}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
