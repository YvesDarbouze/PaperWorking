"use client";

import React from "react";

interface NOIWaterfallChartProps {
  grossIncome: number;
  vacancyLoss: number;
  opex: number;
  noi: number;
}

export default function NOIWaterfallChart({
  grossIncome,
  vacancyLoss,
  opex,
  noi,
}: NOIWaterfallChartProps) {
  const formatCur = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);

  return (
    <div className="relative min-h-[400px] py-4 pr-12 w-full">
      <div className="space-y-4">
        {/* Gross Income */}
        <div className="flex items-center gap-4">
          <div className="w-24 text-right"><span className="text-[10px] text-on-surface-variant font-mono">GROSS</span></div>
          <div className="flex-1 h-12 bg-primary/40 border border-primary/60 rounded flex items-center justify-end px-4 hover:scale-[1.02] transition-transform">
            <span className="font-mono text-primary font-bold">+{formatCur(grossIncome)}</span>
          </div>
        </div>
        
        {/* Expense Steps */}
        <div className="space-y-2 pl-24">
          {/* Vacancy */}
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="flex-1 h-10 bg-error/10 border border-error/30 rounded flex items-center justify-between px-4 hover:border-error/60 transition-colors" style={{ width: "93%", marginLeft: "auto" }}>
              <span className="text-sm font-semibold text-error group-hover:underline">Vacancy</span>
              <span className="font-mono text-error">-{formatCur(vacancyLoss)}</span>
            </div>
          </div>
          
          {/* Operating Expenses */}
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="flex-1 h-10 bg-error/10 border border-error/30 rounded flex items-center justify-between px-4 hover:border-error/60 transition-colors" style={{ width: "85%", marginLeft: "auto" }}>
              <span className="text-sm font-semibold text-error group-hover:underline">OpEx</span>
              <span className="font-mono text-error">-{formatCur(opex)}</span>
            </div>
          </div>
        </div>

        {/* Net Income */}
        <div className="flex items-center gap-4 pt-4">
          <div className="w-24 text-right"><span className="text-[10px] text-primary font-mono font-bold">NET NOI</span></div>
          <div className="flex-1 h-16 bg-primary border-2 border-primary-fixed rounded flex items-center justify-end px-6 shadow-[0_0_30px_rgba(32, 178, 170,0.2)]">
            <div className="text-right">
              <div className="font-mono text-2xl text-on-primary font-bold">{formatCur(noi)}</div>
              <div className="text-[10px] text-on-primary/80 font-bold uppercase tracking-wider">Annual Yield</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
