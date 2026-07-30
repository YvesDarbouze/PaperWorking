'use client';

import React from 'react';
import { ArrowDownRight, PieChart } from 'lucide-react';

interface ExpenseBreakdownWidgetProps {
  totalOpExMtd?: number;
  budgetMtd?: number;
  largestExpenseCategory?: string;
  largestExpenseAmount?: number;
  categories?: Array<{ name: string; amount: number; pct: number }>;
}

export function ExpenseBreakdownWidget({
  totalOpExMtd = 3450,
  budgetMtd = 3800,
  largestExpenseCategory = 'Property Tax',
  largestExpenseAmount = 1400,
  categories = [
    { name: 'Property Tax', amount: 1400, pct: 40.5 },
    { name: 'Insurance', amount: 850, pct: 24.6 },
    { name: 'Maintenance', amount: 650, pct: 18.8 },
    { name: 'Utilities', amount: 550, pct: 16.1 },
  ],
}: ExpenseBreakdownWidgetProps) {
  const isUnderBudget = totalOpExMtd <= budgetMtd;

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
          <ArrowDownRight size={16} className="text-red-400" /> Expense Breakdown
        </h3>
        <span
          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
            isUnderBudget
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900'
              : 'bg-red-950/40 text-red-400 border-red-900'
          }`}
        >
          {isUnderBudget ? 'UNDER BUDGET' : 'OVER BUDGET'}
        </span>
      </div>

      <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
        <div>
          <span className="text-[11px] text-slate-400">Total OpEx MTD</span>
          <div className="text-lg font-black text-white font-mono mt-0.5">
            ${totalOpExMtd.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">/ ${budgetMtd.toLocaleString()} budget</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400">Largest Expense</span>
          <div className="text-xs font-bold text-amber-400 font-mono mt-0.5">
            {largestExpenseCategory} (${largestExpenseAmount.toLocaleString()})
          </div>
        </div>
      </div>

      {/* Category Bars */}
      <div className="flex flex-col gap-2">
        {categories.map((c) => (
          <div key={c.name} className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] text-slate-300 font-medium">
              <span>{c.name}</span>
              <span className="font-mono">${c.amount.toLocaleString()} ({c.pct}%)</span>
            </div>
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500/80 rounded-full"
                style={{ width: `${c.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
