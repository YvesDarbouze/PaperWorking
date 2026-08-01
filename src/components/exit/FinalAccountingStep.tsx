'use client';

import React, { useMemo } from 'react';
import { DollarSign, Landmark, RefreshCw, Key, ShieldCheck, Download, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface FinalAccountingStepProps {
  initialData: any;
  strategy: string;
  onComplete: () => Promise<void>;
}

export default function FinalAccountingStep({
  initialData,
  strategy,
  onComplete,
}: FinalAccountingStepProps) {
  const f = initialData?.financials || {};

  // Financial values
  const purchasePrice = f.purchasePrice / 100 || 220000;
  const rehabCosts = f.projectedRehabCost / 100 || 45000;
  const holdingCosts = f.annualDebtService / 100 || 12000;

  const salePrice = f.exitListPrice || (initialData?.estimatedARV || f.estimatedARV || 320000);
  const currentLoanPayoff = f.loanAmount / 100 || 180000;

  // Calculators
  const sellSummary = useMemo(() => {
    const grossProfit = salePrice - purchasePrice - rehabCosts - holdingCosts;
    const commission = salePrice * 0.06;
    const closingCosts = salePrice * 0.02;
    const netProfit = grossProfit - commission - closingCosts;
    
    const cashInvested = f.totalCashInvested / 100 || 80000;
    const totalReturn = (netProfit / cashInvested) * 100;
    
    // Capital stack waterfall
    const lpReturn = cashInvested * 1.08; // LP gets initial capital + 8% preferred return
    const leadInvestorPromote = Math.max(0, (netProfit - (lpReturn - cashInvested)) * 0.2); // 20% promote
    return {
      grossProfit,
      netProfit,
      totalReturn,
      lpReturn,
      leadInvestorPromote,
      lenderPayoff: currentLoanPayoff,
    };
  }, [salePrice, purchasePrice, rehabCosts, holdingCosts, currentLoanPayoff, f.totalCashInvested]);

  const refiSummary = useMemo(() => {
    const cashOut = f.exitNewLoanAmount || 240000;
    const cashReceived = cashOut - currentLoanPayoff;
    const payment = (cashOut * 0.065) / 12;
    return {
      cashReceived,
      payment,
    };
  }, [f.exitNewLoanAmount, currentLoanPayoff]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Step 4: Final Accounting</h3>
        <p className="text-xs text-slate-400 font-medium">Verify terminal returns distribution waterfall and download tax packet before archiving.</p>
      </div>

      {strategy === 'Sell' && (
        <div className="space-y-4">
          {/* Sale Summary returns cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/5 p-3 rounded-xl">
              <p className="text-[8px] uppercase tracking-wider text-slate-500">Gross Profit</p>
              <p className="text-sm font-bold text-white">${Math.round(sellSummary.grossProfit).toLocaleString()}</p>
            </div>
            <div className="bg-white/5 p-3 rounded-xl">
              <p className="text-[8px] uppercase tracking-wider text-slate-500">Net Profit</p>
              <p className="text-sm font-bold text-white">${Math.round(sellSummary.netProfit).toLocaleString()}</p>
            </div>
            <div className="bg-white/5 p-3 rounded-xl">
              <p className="text-[8px] uppercase tracking-wider text-slate-500">Total Return</p>
              <p className="text-sm font-bold text-emerald-400">{sellSummary.totalReturn.toFixed(1)}%</p>
            </div>
            <div className="bg-white/5 p-3 rounded-xl">
              <p className="text-[8px] uppercase tracking-wider text-slate-500">Hold Period</p>
              <p className="text-sm font-bold text-white">325 Days</p>
            </div>
          </div>

          {/* Capital Stack Waterfall stacked bar */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Capital stack Payout Waterfall</h4>
            <div className="w-full h-5 bg-white/5 rounded-md overflow-hidden flex text-[9px] font-bold text-black text-center">
              <div className="bg-slate-400 h-full flex items-center justify-center" style={{ width: '55%' }}>
                Lender Payoff (${Math.round(sellSummary.lenderPayoff / 1000)}k)
              </div>
              <div className="bg-[#7A9EAA] h-full flex items-center justify-center" style={{ width: '30%' }}>
                LP Returns (${Math.round(sellSummary.lpReturn / 1000)}k)
              </div>
              <div className="bg-emerald-400 h-full flex items-center justify-center" style={{ width: '15%' }}>
                LeadInvestor Promote (${Math.round(sellSummary.leadInvestorPromote / 1000)}k)
              </div>
            </div>
          </div>
        </div>
      )}

      {strategy === 'Refinance' && (
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#7A9EAA]">Refinance closing summary</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-500 uppercase text-[8px]">Cash Received</p>
              <p className="text-sm font-bold text-white">${Math.round(refiSummary.cashReceived).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-500 uppercase text-[8px]">New Payment</p>
              <p className="text-sm font-bold text-white">${Math.round(refiSummary.payment).toLocaleString()}/mo</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Upon complete exit confirmation, this asset continues operations under holding with updated financing variables.
          </p>
        </div>
      )}

      {strategy === 'Hold' && (
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2 text-xs">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#7A9EAA]">Annual Hold review Summary</h4>
          <p className="text-slate-400 leading-relaxed">
            All reviews completed. Compounded metrics will be recalculated annually at the close of the operations cycle.
          </p>
        </div>
      )}

      {/* Tax generation packet block */}
      <div className="p-4 border border-[#7A9EAA]/25 bg-[#7A9EAA]/5 rounded-xl flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-bold text-white">Generate CPA Tax packet</p>
          <p className="text-[11px] text-slate-400">Downloads 1099-S info, capitalized basis summary, and estimated short vs. long term capital gains.</p>
        </div>
        
        <button
          onClick={onComplete}
          className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-bold uppercase tracking-wider text-[10px] rounded-lg transition-all flex items-center gap-1 shrink-0"
        >
          <Download className="w-3.5 h-3.5" /> Download Tax Packet
        </button>
      </div>

      <div className="flex justify-between pt-4 border-t border-white/5">
        <span />
        <button
          onClick={onComplete}
          className="px-6 py-2.5 bg-emerald-500 text-black hover:opacity-90 font-extrabold uppercase tracking-wider text-[11px] rounded-lg transition-opacity flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
        >
          Complete Exit & Archive <CheckCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
