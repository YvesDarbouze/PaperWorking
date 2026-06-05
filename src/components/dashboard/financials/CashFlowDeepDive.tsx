"use client";

import React from "react";

interface CashFlowDeepDiveProps {
  annualDebtService: number;
  monthlyPI: number;
  dscr: number;
  cashFlow: number;
}

export default function CashFlowDeepDive({
  annualDebtService,
  monthlyPI,
  dscr,
  cashFlow,
}: CashFlowDeepDiveProps) {
  const formatCur = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);

  return (
    <section className="glass-card rounded-xl p-6 relative overflow-hidden flex flex-col justify-center h-full" style={{ background: "rgba(11, 20, 26, 0.6)", backdropFilter: "blur(20px)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
      <div className="space-y-8">
        <div className="flex justify-between items-end border-b border-white/5 pb-4">
          <div>
            <span className="block text-[10px] uppercase text-on-surface-variant font-bold">DSCR</span>
            <span className={`text-3xl font-mono font-bold ${dscr >= 1.25 ? 'text-primary' : dscr >= 1.0 ? 'text-amber-500' : 'text-error'}`}>
              {dscr.toFixed(2)}x
            </span>
          </div>
          <div className="text-right">
            <span className="block text-[10px] uppercase text-on-surface-variant font-bold">Status</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              dscr >= 1.25 ? 'bg-primary/20 text-primary' : 
              dscr >= 1.0 ? 'bg-amber-500/20 text-amber-500' : 'bg-error/20 text-error'
            }`}>
              {dscr >= 1.25 ? 'Strong' : dscr >= 1.0 ? 'Marginal' : 'Danger'}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Annual Debt Service</span>
            <span className="font-mono text-on-surface">{formatCur(annualDebtService)}/yr</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Monthly P&I</span>
            <span className="font-mono text-on-surface">{formatCur(monthlyPI)}/mo</span>
          </div>
        </div>

        {/* Mini Chart Mock */}
        <div className="pt-4 border-t border-white/5">
           <div className="flex justify-between items-center mb-2">
             <span className="text-[10px] uppercase text-on-surface-variant font-bold">Cash Flow Trend</span>
             <span className={`text-xs font-mono font-bold ${cashFlow > 0 ? 'text-primary' : 'text-error'}`}>
               {formatCur(cashFlow / 12)}/mo
             </span>
           </div>
           <div className="h-16 w-full relative overflow-hidden rounded">
             <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent"></div>
             {/* Sparkline pseudo-svg */}
             <svg className="absolute bottom-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
               <path d="M0,100 L0,50 Q25,30 50,60 T100,20 L100,100 Z" fill="rgba(32, 178, 170, 0.2)" />
               <path d="M0,50 Q25,30 50,60 T100,20" fill="none" stroke="#20B2AA" strokeWidth="2" />
             </svg>
           </div>
        </div>
      </div>
    </section>
  );
}
