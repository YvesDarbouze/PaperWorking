'use client';

import React from 'react';
import { Activity, TrendingUp } from 'lucide-react';

interface KpiMovementWidgetProps {
  cashOnCashPct?: number;
  cashOnCashDeltaPct?: number;
  dscr?: number;
  dscrDelta?: number;
  capRatePct?: number;
  capRateDeltaPct?: number;
}

export function KpiMovementWidget({
  cashOnCashPct = 8.4,
  cashOnCashDeltaPct = 0.2,
  dscr = 1.42,
  dscrDelta = 0.05,
  capRatePct = 6.8,
  capRateDeltaPct = 0.1,
}: KpiMovementWidgetProps) {
  return (
    <div
      className="p-6 rounded-2xl flex flex-col gap-5"
      style={{
        background: 'rgba(18,16,20,0.97)',
        border: '1px solid rgba(253,255,252,0.10)',
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Activity size={16} className="text-emerald-400" /> KPI Movement
        </h3>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          33 KPI ENGINE
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Cash-on-Cash Return */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-medium">Cash-on-Cash</span>
          <span className="text-lg font-black text-emerald-400 font-mono">{cashOnCashPct}%</span>
          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 font-mono">
            <TrendingUp size={10} /> +{cashOnCashDeltaPct}% MoM
          </span>
        </div>

        {/* DSCR */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-medium">DSCR</span>
          <span className="text-lg font-black text-white font-mono">{dscr}</span>
          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 font-mono">
            <TrendingUp size={10} /> +{dscrDelta} MoM
          </span>
        </div>

        {/* Cap Rate */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-medium">Cap Rate</span>
          <span className="text-lg font-black text-white font-mono">{capRatePct}%</span>
          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 font-mono">
            <TrendingUp size={10} /> +{capRateDeltaPct}% MoM
          </span>
        </div>
      </div>
    </div>
  );
}
