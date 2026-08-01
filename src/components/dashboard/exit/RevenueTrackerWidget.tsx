'use client';

import React from 'react';
import { ArrowUpRight, AlertTriangle, Building2 } from 'lucide-react';

interface RevenueTrackerWidgetProps {
  expectedRent?: number;
  collectedSoFar?: number;
  outstanding?: number;
  vacantUnits?: number;
  collectionRatePct?: number;
}

export function RevenueTrackerWidget({
  expectedRent = 12000,
  collectedSoFar = 10800,
  outstanding = 1200,
  vacantUnits = 0,
  collectionRatePct = 90.0,
}: RevenueTrackerWidgetProps) {
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
          <ArrowUpRight size={16} className="text-emerald-400" /> Revenue Tracker
        </h3>
        <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-900">
          {collectionRatePct}% COLLECTED
        </span>
      </div>

      {/* Progress Bar */}
      <div className="flex flex-col gap-1.5">
        <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${collectionRatePct}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] font-mono text-slate-400">
          <span>Collected: ${collectedSoFar.toLocaleString()}</span>
          <span>Target: ${expectedRent.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col">
          <span className="text-[10px] text-slate-400 font-medium">Expected Rent</span>
          <span className="text-sm font-bold text-white font-mono mt-0.5">
            ${expectedRent.toLocaleString()}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/40 flex flex-col">
          <span className="text-[10px] text-amber-400 font-medium flex items-center gap-1">
            <AlertTriangle size={10} /> Outstanding
          </span>
          <span className="text-sm font-bold text-amber-400 font-mono mt-0.5">
            ${outstanding.toLocaleString()}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col">
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <Building2 size={10} /> Vacant Units
          </span>
          <span className="text-sm font-bold text-white font-mono mt-0.5">{vacantUnits}</span>
        </div>
      </div>
    </div>
  );
}
