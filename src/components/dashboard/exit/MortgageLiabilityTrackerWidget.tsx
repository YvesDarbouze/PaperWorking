'use client';

import React from 'react';
import { Landmark, Calendar, ShieldCheck } from 'lucide-react';

interface MortgageLiabilityTrackerWidgetProps {
  lenderName?: string;
  currentBalance?: number;
  nextPaymentAmount?: number;
  nextPaymentDueDate?: string;
  ytdInterestPaid?: number;
  principalPaidYtd?: number;
  remainingTermMonths?: number;
}

export function MortgageLiabilityTrackerWidget({
  lenderName = 'Wells Fargo Home Mortgage',
  currentBalance = 285000,
  nextPaymentAmount = 2076,
  nextPaymentDueDate = 'Aug 1, 2026',
  ytdInterestPaid = 14890,
  principalPaidYtd = 4210,
  remainingTermMonths = 312,
}: MortgageLiabilityTrackerWidgetProps) {
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
          <Landmark size={16} className="text-blue-400" /> Mortgage &amp; Liability Tracker
        </h3>
        <span className="text-[10px] font-mono text-blue-400 font-bold bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-900">
          PLAID LIABILITIES
        </span>
      </div>

      <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/5">
        <span className="text-[10px] text-slate-400 font-medium">{lenderName}</span>
        <div className="text-xl font-black text-white font-mono">
          ${currentBalance.toLocaleString()}{' '}
          <span className="text-xs font-normal text-slate-400">principal remaining</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-0.5">
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <Calendar size={10} /> Next Payment
          </span>
          <span className="text-sm font-bold text-white font-mono">
            ${nextPaymentAmount.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Due {nextPaymentDueDate}</span>
        </div>

        <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 flex flex-col gap-0.5">
          <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
            <ShieldCheck size={10} /> YTD Interest Paid
          </span>
          <span className="text-sm font-bold text-emerald-400 font-mono">
            ${ytdInterestPaid.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Tax deductible</span>
        </div>
      </div>

      <div className="flex justify-between items-center text-xs text-slate-400 font-mono pt-1 border-t border-slate-800">
        <span>Principal Paid YTD: ${principalPaidYtd.toLocaleString()}</span>
        <span>Remaining: {remainingTermMonths} mos</span>
      </div>
    </div>
  );
}
