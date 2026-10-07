'use client';

import React, { useState } from 'react';
import type { PurchaseCriteriaResult, PurchaseCriteriaInputs } from '@paperworking/financial-engine';

interface PurchaseCriteriaCardProps {
  criteria: PurchaseCriteriaInputs;
  onChangeCriteria: (newCriteria: PurchaseCriteriaInputs) => void;
  result?: PurchaseCriteriaResult;
}

export default function PurchaseCriteriaCard({
  criteria,
  onChangeCriteria,
  result,
}: PurchaseCriteriaCardProps) {
  const [showConfig, setShowConfig] = useState(false);

  const handleUpdate = (field: keyof PurchaseCriteriaInputs, val: number) => {
    onChangeCriteria({
      ...criteria,
      [field]: val,
    });
  };

  const statusColor =
    result?.overallStatus === 'GREEN_LIGHT'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
      : result?.overallStatus === 'YELLOW_WARNING'
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
        : 'border-red-500/40 bg-red-500/10 text-red-300';

  const statusLabel =
    result?.overallStatus === 'GREEN_LIGHT'
      ? 'GREEN LIGHT: MEETS BUY BOX'
      : result?.overallStatus === 'YELLOW_WARNING'
        ? 'YELLOW WARNING: MARGINAL METRICS'
        : 'RED LIGHT: FAILS BUY BOX';

  return (
    <div
      data-testid="purchase-criteria-card"
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md space-y-4"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-emerald-400">
              verified
            </span>
            <span>Purchase Criteria Screening (Buy Box Scorecard)</span>
          </h2>
          <p className="text-[11px] text-white/50 mt-0.5">
            Institutional go / no-go screening against your target return thresholds.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowConfig(!showConfig)}
          className="text-xs font-semibold text-[color:var(--color-primary)] hover:underline flex items-center gap-1"
        >
          <span>{showConfig ? 'Done' : 'Edit Criteria'}</span>
          <span className="material-symbols-outlined text-[14px]">
            {showConfig ? 'check' : 'tune'}
          </span>
        </button>
      </div>

      {/* Threshold Configuration Drawer */}
      {showConfig && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 rounded-xl border border-white/10 bg-black/30 text-xs animate-in fade-in duration-150">
          <div>
            <label htmlFor="criteria-min-coc-pct" className="block text-[10.5px] font-medium text-white/50 mb-1">
              Min CoC (%)
            </label>
            <input
              id="criteria-min-coc-pct"
              type="number"
              step="0.5"
              value={criteria.minCashOnCashPct ?? 8.0}
              onChange={(e) => handleUpdate('minCashOnCashPct', Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2 text-white font-mono font-semibold focus:outline-none focus:border-[color:var(--color-primary)] min-h-[40px]"
            />
          </div>
          <div>
            <label htmlFor="criteria-min-dscr" className="block text-[10.5px] font-medium text-white/50 mb-1">
              Min DSCR
            </label>
            <input
              id="criteria-min-dscr"
              type="number"
              step="0.05"
              value={criteria.minDscr ?? 1.25}
              onChange={(e) => handleUpdate('minDscr', Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2 text-white font-mono font-semibold focus:outline-none focus:border-[color:var(--color-primary)] min-h-[40px]"
            />
          </div>
          <div>
            <label htmlFor="criteria-min-cap-rate-pct" className="block text-[10.5px] font-medium text-white/50 mb-1">
              Min Cap Rate (%)
            </label>
            <input
              id="criteria-min-cap-rate-pct"
              type="number"
              step="0.25"
              value={criteria.minCapRatePct ?? 6.0}
              onChange={(e) => handleUpdate('minCapRatePct', Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2 text-white font-mono font-semibold focus:outline-none focus:border-[color:var(--color-primary)] min-h-[40px]"
            />
          </div>
          <div>
            <label htmlFor="criteria-min-flip-profit" className="block text-[10.5px] font-medium text-white/50 mb-1">
              Min Flip Profit ($)
            </label>
            <input
              id="criteria-min-flip-profit"
              type="number"
              step="5000"
              value={criteria.minFlipProfit ?? 30000}
              onChange={(e) => handleUpdate('minFlipProfit', Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2 text-white font-mono font-semibold focus:outline-none focus:border-[color:var(--color-primary)] min-h-[40px]"
            />
          </div>
          <div>
            <label htmlFor="criteria-max-ltv-pct" className="block text-[10.5px] font-medium text-white/50 mb-1">
              Max LTV (%)
            </label>
            <input
              id="criteria-max-ltv-pct"
              type="number"
              step="5"
              value={criteria.maxLtvPct ?? 80.0}
              onChange={(e) => handleUpdate('maxLtvPct', Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2 text-white font-mono font-semibold focus:outline-none focus:border-[color:var(--color-primary)] min-h-[40px]"
            />
          </div>
        </div>
      )}

      {/* Overall Status Badge */}
      {result && (
        <div className="space-y-3">
          <div className={`flex items-center justify-between rounded-xl border p-3.5 ${statusColor}`}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">
                {result.overallStatus === 'GREEN_LIGHT'
                  ? 'check_circle'
                  : result.overallStatus === 'YELLOW_WARNING'
                    ? 'warning'
                    : 'cancel'}
              </span>
              <span className="text-xs font-extrabold tracking-wider">{statusLabel}</span>
            </div>
            <span className="text-[11px] font-mono font-bold">
              {result.passedCount} Passed • {result.warningCount} Warnings • {result.failedCount} Failed
            </span>
          </div>

          {/* Evaluations Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {result.evaluations.map((item) => {
              const itemBorder =
                item.status === 'pass'
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : item.status === 'warn'
                    ? 'border-amber-500/20 bg-amber-500/5'
                    : 'border-red-500/20 bg-red-500/5';
              const itemIcon =
                item.status === 'pass' ? 'check_circle' : item.status === 'warn' ? 'error' : 'cancel';
              const itemIconColor =
                item.status === 'pass' ? 'text-emerald-400' : item.status === 'warn' ? 'text-amber-400' : 'text-red-400';

              return (
                <div
                  key={item.id}
                  data-testid="criteria-status-chip"
                  className={`rounded-xl border p-3 flex flex-col justify-between ${itemBorder}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-white/90">{item.name}</span>
                    <span className={`material-symbols-outlined text-[16px] ${itemIconColor}`}>
                      {itemIcon}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-white/60 font-mono">
                    <span>Actual: <strong className="text-white">{item.actual}</strong></span>
                    <span>Target: {item.target}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-white/45">{item.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
