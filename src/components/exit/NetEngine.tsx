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
    <div className="bg-pw-black border border-gray-800 rounded-2xl overflow-hidden shadow-2xl mt-8">
      <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-black/40">
         <div className="flex items-center space-x-3">
           <div className="p-2 bg-emerald-500/20 rounded-lg">
             <Activity className="w-6 h-6 text-emerald-400" />
           </div>
           <div>
             <h2 className="text-xl font-light tracking-wide text-white">Profitability Hub</h2>
             <p className="text-xs text-text-secondary font-mono tracking-widest uppercase">The Net Engine • {deal.status === 'Sold' ? 'FINAL REALIZED' : 'FORECASTED'}</p>
           </div>
         </div>
      </div>

      <div className="p-8">
        {/* Massive Net Profit Readout */}
        <div className="text-center mb-10">
           <p className="text-sm font-semibold text-text-secondary tracking-[0.2em] mb-2 uppercase">{isBrrrr ? 'Capital Pulled Out' : 'Total Net Profit'}</p>
           <h1 className={`text-6xl font-light tracking-tighter ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
             {netProfit >= 0 ? '+' : '-'}${Math.abs(netProfit).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
           </h1>
           <div className="mt-4 flex items-center justify-center space-x-6">
              <div className="flex items-center text-emerald-200">
                 <TrendingUp className="w-4 h-4 mr-1 opacity-50" />
                 <span className="text-lg font-mono">{roi.toFixed(2)}% <span className="text-xs text-text-secondary ml-1">ROI</span></span>
              </div>
              <div className="flex items-center text-emerald-200">
                 <CalendarDays className="w-4 h-4 mr-1 opacity-50" />
                 <span className="text-lg font-mono">{annualizedIrr.toFixed(2)}% <span className="text-xs text-text-secondary ml-1">IRR (Ann.)</span></span>
              </div>
              <div className="flex items-center text-emerald-200">
                 <span className="text-lg font-mono">{Math.round(holdDays)} <span className="text-xs text-text-secondary ml-1">Hold Days</span></span>
              </div>
           </div>
        </div>

        {/* Ledger Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-black/30 rounded-xl border border-gray-800 text-sm">
           
           <div>
             <p className="text-text-secondary font-mono text-xs uppercase mb-1">{isBrrrr ? 'Refi Value (75% LTV)' : 'Gross Proceeds'}</p>
             <p className="text-white font-medium">${proceeds.toLocaleString()}</p>
           </div>
           <div>
             <p className="text-red-400/70 font-mono text-xs uppercase mb-1">Total Rehab</p>
             <p className="text-white font-medium">-${totalApprovedRehab.toLocaleString()}</p>
           </div>
           <div>
             <p className="text-red-400/70 font-mono text-xs uppercase mb-1">Capital & Holding</p>
             <p className="text-white font-medium">-${(capitalCost + holdingCost).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
           </div>
           <div>
             <p className="text-red-400/70 font-mono text-xs uppercase mb-1">Commissions & Fees</p>
             <p className="text-white font-medium">-${(actualCommissions + finalClosingCosts).toLocaleString()}</p>
           </div>
        </div>
      </div>
    </div>
  );
}
