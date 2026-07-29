'use client';

import React from 'react';
import { Percent, CheckCircle2, AlertCircle } from 'lucide-react';

export interface RealizedReturnsSummaryProps {
  actualIRR: number | null;
  actualEquityMultiple: number | null;
  totalCashInvested: number;
  netProfit: number;
  completenessPercent: number; // 0 to 100
  missingFields?: string[];
}

export function RealizedReturnsSummary({
  actualIRR,
  actualEquityMultiple,
  totalCashInvested,
  netProfit,
  completenessPercent,
  missingFields = []
}: RealizedReturnsSummaryProps) {
  const isComplete = completenessPercent >= 100;

  const fmtCurrency = (val: number) =>
    val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <div data-testid="realized-returns-summary" className="glass-card rounded-2xl p-6 space-y-5 border border-white/10 bg-[#121014]/80">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2 font-outfit">
          <Percent className="w-4 h-4 text-[#7A9EAA]" />
          Returns Summary & Actualized Cash Flows
        </h3>
        <span
          data-testid="data-completeness-badge"
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            isComplete
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
          }`}
        >
          {isComplete ? '100% Data Complete' : `${Math.round(completenessPercent)}% Data Complete (partial data)`}
        </span>
      </div>

      {/* Completeness Meter */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span>Actuals Completeness Meter</span>
          <span>{Math.round(completenessPercent)}%</span>
        </div>
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
          <div
            className={`h-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: `${Math.min(100, completenessPercent)}%` }}
          />
        </div>
        {!isComplete && missingFields.length > 0 && (
          <p className="text-[10px] text-amber-400/90 flex items-center gap-1 mt-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            Missing inputs for 100% completeness: {missingFields.join(', ')}
          </p>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-white/10">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Actualized IRR</span>
          <p className="text-xl font-bold text-emerald-400 tabular-nums mt-0.5">
            {actualIRR !== null ? `${actualIRR.toFixed(1)}%` : '—'}
          </p>
          {!isComplete && <span className="text-[9px] text-amber-400 font-semibold">partial data</span>}
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Equity Multiple</span>
          <p className="text-xl font-bold text-white tabular-nums mt-0.5">
            {actualEquityMultiple !== null ? `${actualEquityMultiple.toFixed(2)}x` : '—'}
          </p>
          {!isComplete && <span className="text-[9px] text-amber-400 font-semibold">partial data</span>}
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Cash Invested</span>
          <p className="text-xl font-bold text-white tabular-nums mt-0.5">{fmtCurrency(totalCashInvested)}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Realized Net Profit</span>
          <p className={`text-xl font-bold tabular-nums mt-0.5 ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {fmtCurrency(netProfit)}
          </p>
        </div>
      </div>
    </div>
  );
}
