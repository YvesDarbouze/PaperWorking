import React, { useState } from 'react';
import { Project } from '@/types/schema';
import { Banknote, TrendingUp, CalendarDays, Activity } from 'lucide-react';
import { calculateNetEngine } from '@/lib/math/calculatorUtils';

export default function NetEngine({ deal, isBrrrr = false }: { deal: Project, isBrrrr?: boolean }) {
  if (!deal) return null;

  const {
    totalApprovedRehab,
    capitalCost,
    holdingCost,
    holdDays,
    proceeds,
    actualCommissions,
    totalInvestment,
    netProfit,
    roi,
    annualizedIrr
  } = calculateNetEngine(deal, isBrrrr);
  
  const finalClosingCosts = deal.financials?.finalClosingCosts || 0;

  return (
    <div className="glass-card border border-pw-border mt-8">
      <div className="p-6 border-b border-pw-border flex items-center justify-between bg-pw-bg/20">
         <div className="flex items-center space-x-3">
            <div className="p-2 bg-pw-accent/10">
              <Activity className="w-6 h-6 text-pw-accent" />
            </div>
            <div>
              <h2 className="text-xl font-light tracking-wide text-text-primary">Profitability Hub</h2>
              <p className="text-[10px] text-text-secondary font-mono tracking-widest uppercase">The Net Engine • {(deal.status === 'exit' && deal.dispositionType === 'SALE') ? 'FINAL REALIZED' : 'FORECASTED'}</p>
            </div>
         </div>
      </div>

      <div className="p-8">
        {/* Massive Net Profit Readout */}
        <div className="text-center mb-10">
           <p className="text-xs font-semibold text-text-secondary tracking-[0.2em] mb-2 uppercase">{isBrrrr ? 'Capital Pulled Out' : 'Total Net Profit'}</p>
           <h1 className={`text-6xl font-light tracking-tighter ${netProfit >= 0 ? 'text-pw-accent' : 'text-color-error'}`}>
             {netProfit >= 0 ? '+' : '-'}${Math.abs(netProfit).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
           </h1>
           <div className="mt-4 flex items-center justify-center space-x-6">
              <div className="flex items-center text-text-primary">
                 <TrendingUp className="w-4 h-4 mr-1 text-pw-accent" />
                 <span className="text-base font-mono">{roi.toFixed(2)}% <span className="text-[10px] text-text-secondary ml-1">ROI</span></span>
              </div>
              <div className="flex items-center text-text-primary">
                 <CalendarDays className="w-4 h-4 mr-1 text-pw-accent" />
                 <span className="text-base font-mono">{annualizedIrr.toFixed(2)}% <span className="text-[10px] text-text-secondary ml-1">IRR (Ann.)</span></span>
              </div>
              <div className="flex items-center text-text-primary">
                 <span className="text-base font-mono">{Math.round(holdDays)} <span className="text-[10px] text-text-secondary ml-1">Hold Days</span></span>
              </div>
           </div>
        </div>

        {/* Ledger Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-pw-bg/30 border border-pw-border text-sm">
           
           <div>
             <p className="text-text-secondary font-mono text-[10px] uppercase mb-1">{isBrrrr ? 'Refi Value (75% LTV)' : 'Gross Proceeds'}</p>
             <p className="text-text-primary font-medium">${proceeds.toLocaleString()}</p>
           </div>
           <div>
             <p className="text-color-error/80 font-mono text-[10px] uppercase mb-1">Total Rehab</p>
             <p className="text-text-primary font-medium">-${totalApprovedRehab.toLocaleString()}</p>
           </div>
           <div>
             <p className="text-color-error/80 font-mono text-[10px] uppercase mb-1">Capital & Holding</p>
             <p className="text-text-primary font-medium">-${(capitalCost + holdingCost).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
           </div>
           <div>
             <p className="text-color-error/80 font-mono text-[10px] uppercase mb-1">Commissions & Fees</p>
             <p className="text-text-primary font-medium">-${(actualCommissions + finalClosingCosts).toLocaleString()}</p>
           </div>
        </div>
      </div>
    </div>
  );
}
