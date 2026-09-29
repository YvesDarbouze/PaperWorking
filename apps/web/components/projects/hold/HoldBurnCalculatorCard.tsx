'use client';

import React, { useState } from 'react';
import { formatCurrency, formatPercent } from '@/lib/projects/phase-utils';
import type { ProjectWorkspace } from '@/lib/projects/types';

interface HoldBurnCalculatorCardProps {
  project: ProjectWorkspace;
  monthlyBurn: number;
  dispositionStrategy: 'RENT' | 'LEASE' | 'SALE';
  targetARV?: number;
  initialDaysInHold?: number;
  onUpdateDaysInHold?: (days: number) => void;
}

export default function HoldBurnCalculatorCard({
  project,
  monthlyBurn,
  dispositionStrategy,
  targetARV = 710000,
  initialDaysInHold = 90,
  onUpdateDaysInHold,
}: HoldBurnCalculatorCardProps) {
  const [daysInHold, setDaysInHold] = useState<number>(initialDaysInHold);

  const dailyBurnRate = Math.round((monthlyBurn * 12) / 365);
  const totalHoldingDrag = Math.round(dailyBurnRate * daysInHold);

  // Financial baseline
  const purchasePrice = Number(project.purchasePrice || project.purchase_price || 485000);
  const rehabCost = Number(project.rehab_costs || 65000);
  const grossRent = Number(project.underwriting?.rentRoll?.grossScheduledRent || 3800);
  const monthlyNOI = Math.round(grossRent * 0.65 - (monthlyBurn - (project.funding?.monthlyDebtService || 2400)));

  // Strategy Specific Calculations
  const grossFlipMargin = Math.max(0, targetARV - purchasePrice - rehabCost);
  const netFlipMarginAfterHold = Math.max(0, grossFlipMargin - totalHoldingDrag);
  const profitErosionPct = grossFlipMargin > 0 ? Math.min(100, Math.round((totalHoldingDrag / grossFlipMargin) * 100)) : 0;

  // Fix-and-Flip Breakeven Resale Modeling
  const buyerClosingCosts = Number(project.funding?.closingCosts || Math.round(purchasePrice * 0.02));
  const dispositionRatePct = 5.0; // 5% exit selling commission & closing costs
  const totalInvestedBasis = purchasePrice + rehabCost + buyerClosingCosts + totalHoldingDrag;
  const breakevenSellingPrice = Math.round(totalInvestedBasis / (1 - dispositionRatePct / 100));
  const dispositionFeesAtBreakeven = Math.round(breakevenSellingPrice * (dispositionRatePct / 100));
  const targetNetProfitAtARV = Math.round(targetARV * (1 - dispositionRatePct / 100) - totalInvestedBasis);
  const arvHeadroom = targetARV - breakevenSellingPrice;
  const arvHeadroomPct = targetARV > 0 ? (arvHeadroom / targetARV) * 100 : 0;

  // 6-Month Rule-of-Thumb Holding Period Benchmark (180 days)
  const sixMonthHoldingDrag = Math.round(dailyBurnRate * 180);
  const sixMonthBreakevenBasis = purchasePrice + rehabCost + buyerClosingCosts + sixMonthHoldingDrag;
  const sixMonthBreakevenPrice = Math.round(sixMonthBreakevenBasis / (1 - dispositionRatePct / 100));

  const paybackMonths = monthlyNOI > 0 ? (totalHoldingDrag / monthlyNOI).toFixed(1) : 'N/A';

  const handleSliderChange = (val: number) => {
    setDaysInHold(val);
    if (onUpdateDaysInHold) {
      onUpdateDaysInHold(val);
    }
  };

  return (
    <div className="border border-neutral-800 bg-neutral-950 p-5 rounded-none space-y-5" data-testid="hold-burn-calculator-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block font-semibold">
            Capital Velocity & Holding Drag
          </span>
          <h2 className="text-base font-bold text-white mt-0.5">
            Daily Burn Rate & Cumulative Holding Period Drag
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1 border border-neutral-700 bg-neutral-900 text-amber-300 font-bold rounded-none">
            {`${formatCurrency(dailyBurnRate)} / Day`}
          </span>
          <span className="text-xs font-mono px-3 py-1 border border-neutral-700 bg-neutral-900 text-white font-bold rounded-none">
            {`${formatCurrency(monthlyBurn)} / Month`}
          </span>
        </div>
      </div>

      {/* Days in Hold Control Slider */}
      <div className="border border-neutral-800 bg-neutral-900/60 p-4 rounded-none space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-neutral-300">Projected Holding Duration:</span>
          <span className="font-mono text-sm font-bold text-white">{`${daysInHold} Days (${Math.round(daysInHold / 30)} Months)`}</span>
        </div>
        <input
          type="range"
          min="15"
          max="365"
          step="5"
          value={daysInHold}
          onChange={(e) => handleSliderChange(Number(e.target.value))}
          className="w-full accent-white cursor-pointer min-h-[44px]"
          aria-label="Adjust projected holding days"
        />
        <div className="flex justify-between text-[10px] font-mono text-neutral-400">
          <span>15 Days (Quick Staging)</span>
          <span>90 Days (Standard Turn)</span>
          <span>180 Days (6-Month Rule of Thumb)</span>
          <span>365 Days (Full Hold)</span>
        </div>
      </div>

      {/* Strategy Impact Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Total Holding Cost Drag */}
        <div className="border border-neutral-800 bg-neutral-900/40 p-4 rounded-none">
          <span className="text-[10px] font-mono uppercase text-neutral-400 block">Total Carrying Drag</span>
          <span className="text-xl font-bold font-mono text-red-400 mt-1 block">
            {`-${formatCurrency(totalHoldingDrag)}`}
          </span>
          <span className="text-[11px] text-neutral-400 font-mono mt-0.5 block">
            {formatCurrency(dailyBurnRate)}/day × {daysInHold} days
          </span>
        </div>

        {/* Strategy Specific Metric 1 */}
        {dispositionStrategy === 'SALE' ? (
          <div className="border border-neutral-800 bg-neutral-900/40 p-4 rounded-none">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block">Net Margin After Drag</span>
            <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
              {formatCurrency(netFlipMarginAfterHold)}
            </span>
            <span className="text-[11px] text-neutral-400 font-mono mt-0.5 block">
              Gross margin: {formatCurrency(grossFlipMargin)}
            </span>
          </div>
        ) : (
          <div className="border border-neutral-800 bg-neutral-900/40 p-4 rounded-none">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block">NOI Recoup Timeline</span>
            <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
              {paybackMonths} Months
            </span>
            <span className="text-[11px] text-neutral-400 font-mono mt-0.5 block">
              to recover holding drag from operating NOI
            </span>
          </div>
        )}

        {/* Strategy Specific Metric 2 */}
        {dispositionStrategy === 'SALE' ? (
          <div className="border border-neutral-800 bg-neutral-900/40 p-4 rounded-none">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block">Profit Margin Erosion</span>
            <span className="text-xl font-bold font-mono text-amber-300 mt-1 block">
              {profitErosionPct}% Eaten by Hold
            </span>
            <span className="text-[11px] text-neutral-400 font-mono mt-0.5 block">
              Holding drag vs gross flip spread
            </span>
          </div>
        ) : (
          <div className="border border-neutral-800 bg-neutral-900/40 p-4 rounded-none">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block">Stabilized Cash Yield Drag</span>
            <span className="text-xl font-bold font-mono text-amber-300 mt-1 block">
              {formatPercent((totalHoldingDrag / purchasePrice) * 100)}
            </span>
            <span className="text-[11px] text-neutral-400 font-mono mt-0.5 block">
              of total purchase cost basis
            </span>
          </div>
        )}
      </div>

      {/* Fix-and-Flip Breakeven Resale Calculator (SALE Strategy Only) */}
      {dispositionStrategy === 'SALE' && (
        <div
          data-testid="breakeven-resale-calculator"
          className="border border-neutral-800 bg-neutral-900/40 p-4 rounded-none space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">
                  Fix-and-Flip Capital Protection
                </span>
                <span
                  data-testid="breakeven-headroom-badge"
                  className={`px-2 py-0.5 text-[10px] font-mono uppercase font-bold border rounded-none ${
                    arvHeadroom > 0
                      ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400'
                      : 'border-red-600 bg-red-950/40 text-red-400'
                  }`}
                >
                  {arvHeadroom > 0 ? `+${formatCurrency(arvHeadroom)} Safety Cushion` : 'Negative Spread Warning'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mt-0.5">
                Breakeven Resale Selling Price Formula
              </h3>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[10px] font-mono text-neutral-400 block uppercase">
                Breakeven Target
              </span>
              <span
                data-testid="breakeven-selling-price"
                className="text-base font-bold font-mono text-amber-300"
              >
                {formatCurrency(breakevenSellingPrice)}
              </span>
            </div>
          </div>

          {/* Line item derivation grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 font-mono text-xs pt-2 border-t border-neutral-800">
            <div className="border border-neutral-800/60 bg-neutral-950/50 p-2.5">
              <span className="text-[10px] text-neutral-400 block uppercase">1. Purchase Price</span>
              <span className="text-white font-bold block mt-0.5">{formatCurrency(purchasePrice)}</span>
            </div>
            <div className="border border-neutral-800/60 bg-neutral-950/50 p-2.5">
              <span className="text-[10px] text-neutral-400 block uppercase">2. Rehab Budget</span>
              <span className="text-white font-bold block mt-0.5">{formatCurrency(rehabCost)}</span>
            </div>
            <div className="border border-neutral-800/60 bg-neutral-950/50 p-2.5">
              <span className="text-[10px] text-neutral-400 block uppercase">3. Closing Costs</span>
              <span className="text-white font-bold block mt-0.5">{formatCurrency(buyerClosingCosts)}</span>
            </div>
            <div className="border border-neutral-800/60 bg-neutral-950/50 p-2.5">
              <span className="text-[10px] text-neutral-400 block uppercase">4. Holding Drag</span>
              <span className="text-red-400 font-bold block mt-0.5">{`+${formatCurrency(totalHoldingDrag)}`}</span>
            </div>
            <div className="border border-neutral-800/60 bg-neutral-950/50 p-2.5 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-neutral-400 block uppercase">5. Exit Fees (5%)</span>
              <span className="text-amber-300 font-bold block mt-0.5">{`+${formatCurrency(dispositionFeesAtBreakeven)}`}</span>
            </div>
          </div>

          {/* Comparison with 6-month benchmark */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-neutral-800/80 text-xs font-mono">
            <div className="border border-neutral-800 bg-neutral-950/40 p-3">
              <span className="text-[10px] text-neutral-400 uppercase block font-semibold">
                Current Model ({daysInHold} Days)
              </span>
              <div className="flex justify-between items-center mt-1">
                <span className="text-neutral-300">Target ARV:</span>
                <span className="text-white font-bold">{formatCurrency(targetARV)}</span>
              </div>
              <div className="flex justify-between items-center mt-0.5">
                <span className="text-neutral-300">Breakeven Price:</span>
                <span className="text-amber-300 font-bold">{formatCurrency(breakevenSellingPrice)}</span>
              </div>
              <div className="flex justify-between items-center mt-0.5 pt-1 border-t border-neutral-800">
                <span className="text-neutral-300">Target Net Profit:</span>
                <span className="text-emerald-400 font-bold">{formatCurrency(targetNetProfitAtARV)}</span>
              </div>
            </div>

            <div className="border border-neutral-800 bg-neutral-950/40 p-3">
              <span className="text-[10px] text-neutral-400 uppercase block font-semibold">
                6-Month Benchmark (180 Days Standard Rule)
              </span>
              <div className="flex justify-between items-center mt-1">
                <span className="text-neutral-300">180-Day Holding Drag:</span>
                <span className="text-red-400 font-bold">{`-${formatCurrency(sixMonthHoldingDrag)}`}</span>
              </div>
              <div className="flex justify-between items-center mt-0.5">
                <span className="text-neutral-300">6-Month Breakeven Target:</span>
                <span className="text-amber-300 font-bold">{formatCurrency(sixMonthBreakevenPrice)}</span>
              </div>
              <div className="flex justify-between items-center mt-0.5 pt-1 border-t border-neutral-800">
                <span className="text-neutral-300">Headroom Cushion:</span>
                <span className="text-emerald-400 font-bold">{formatCurrency(targetARV - sixMonthBreakevenPrice)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
