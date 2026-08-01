'use client';

import React from 'react';
import { DollarSign, CheckCircle2, Clock, TrendingUp } from 'lucide-react';

interface TodayFinancialSnapshotWidgetProps {
  newTransactionsCount?: number;
  autoApprovedCount?: number;
  pendingReviewCount?: number;
  cashFlowMtd?: number;
  vsLastMonthPct?: number;
}

export function TodayFinancialSnapshotWidget({
  newTransactionsCount = 14,
  autoApprovedCount = 11,
  pendingReviewCount = 3,
  cashFlowMtd = 4850,
  vsLastMonthPct = 6.2,
}: TodayFinancialSnapshotWidgetProps) {
  const isPositive = vsLastMonthPct >= 0;

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
          <DollarSign size={16} className="text-emerald-400" /> Today's Financial Snapshot
        </h3>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          LIVE STREAM
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col">
          <span className="text-[10px] text-slate-400 font-medium">New Activity</span>
          <span className="text-lg font-black text-white font-mono mt-0.5">{newTransactionsCount}</span>
        </div>
        <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 flex flex-col">
          <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 size={10} /> Auto-Approved
          </span>
          <span className="text-lg font-black text-emerald-400 font-mono mt-0.5">{autoApprovedCount}</span>
        </div>
        <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/40 flex flex-col">
          <span className="text-[10px] text-amber-400 font-medium flex items-center gap-1">
            <Clock size={10} /> Pending Review
          </span>
          <span className="text-lg font-black text-amber-400 font-mono mt-0.5">{pendingReviewCount}</span>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-900/40 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-slate-400">Cash Flow MTD</span>
          <span className="text-xl font-black text-emerald-400 font-mono">
            ${cashFlowMtd.toLocaleString()}
          </span>
        </div>
        <div
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
            isPositive ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
          }`}
        >
          <TrendingUp size={12} /> {isPositive ? `+${vsLastMonthPct}%` : `${vsLastMonthPct}%`} vs. last month
        </div>
      </div>
    </div>
  );
}
