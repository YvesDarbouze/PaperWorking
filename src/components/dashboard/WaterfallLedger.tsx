'use client';

import React from 'react';
import { User, DollarSign, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { formatCentsToDollars } from '@/lib/calculations/financials';

export interface Payout {
  id: string;
  payee: string;
  role: string;
  amount: number; // cents
  status: 'pending' | 'confirmed';
}

interface WaterfallLedgerProps {
  payouts: Payout[];
  onConfirmPayout?: (id: string) => void;
}

/**
 * Payee Waterfall Ledger
 * 
 * Tracks exact payouts for partners, lenders, and vendors upon deal closing.
 * Redesigned for institutional density and clarity.
 */
const WaterfallLedger: React.FC<WaterfallLedgerProps> = ({ 
  payouts, 
  onConfirmPayout 
}) => {
  const totalAmount = payouts.reduce((sum, p) => sum + p.amount, 0);
  const confirmedAmount = payouts.filter(p => p.status === 'confirmed').reduce((sum, p) => sum + p.amount, 0);
  const progressPercent = totalAmount > 0 ? (confirmedAmount / totalAmount) * 100 : 0;

  return (
    <div className="ag-card flex flex-col h-full bg-pw-surface shadow-sm border border-pw-border/20">
      <div className="px-8 py-10 flex justify-between items-end shrink-0 border-b border-pw-border/10">
        <div className="space-y-2">
          <p className="ag-label text-pw-muted opacity-60">Payee Waterfall</p>
          <h3 className="text-3xl font-light text-pw-black tracking-tighter">Settlement Ledger</h3>
          <p className="text-sm text-pw-muted font-normal tracking-tight">Active disbursement protocol for partner settlement.</p>
        </div>
        <div className="text-right">
          <p className="ag-label opacity-60 mb-2">Total Exposure</p>
          <p className="text-2xl font-medium text-pw-black tracking-tighter">{formatCentsToDollars(totalAmount)}</p>
        </div>
      </div>

      {/* Settlement Progress Strip */}
      <div className="h-1 w-full bg-pw-bg flex">
         <div 
           className="h-full bg-pw-black transition-all duration-1000 ease-in-out" 
           style={{ width: `${progressPercent}%` }} 
         />
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        <table className="w-full text-left border-collapse mt-4">
          <thead>
            <tr className="text-[10px] font-bold tracking-[0.2em] text-pw-muted uppercase">
              <th className="px-6 py-4">Identity</th>
              <th className="px-6 py-4">Allocation</th>
              <th className="px-6 py-4 text-right">Value</th>
              <th className="px-6 py-4 text-center w-24">Auth</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pw-border/20">
            {payouts.map((payout) => {
              const isSettled = payout.status === 'confirmed';
              return (
                <tr 
                  key={payout.id} 
                  className={`group transition-all duration-300 ${isSettled ? 'bg-pw-bg/50' : 'hover:bg-pw-bg/30'}`}
                >
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isSettled ? 'bg-pw-black text-pw-white' : 'bg-pw-bg text-pw-muted'
                      }`}>
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-base font-medium text-pw-black tracking-tight">{payout.payee}</p>
                        <p className="text-xs text-pw-muted font-normal mt-0.5">{payout.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 font-sans">
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${
                      isSettled ? 'bg-pw-black text-pw-white' : 'bg-pw-bg text-pw-muted border border-pw-border/30'
                    }`}>
                      {isSettled ? 'Settled' : 'Pending Signature'}
                    </span>
                  </td>
                  <td className="px-6 py-6 text-right text-lg font-medium text-pw-black tracking-tighter">
                    {formatCentsToDollars(payout.amount)}
                  </td>
                  <td className="px-6 py-6 text-center">
                    <button 
                      onClick={() => onConfirmPayout?.(payout.id)}
                      disabled={isSettled}
                      className={`p-2 rounded-full transition-all ${
                        isSettled 
                          ? 'text-pw-black cursor-default' 
                          : 'text-pw-border hover:bg-pw-bg hover:text-pw-black'
                      }`}
                    >
                      {isSettled ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-10 bg-pw-surface border-t border-pw-border/10 shrink-0">
        <button className="ag-button w-full space-x-4">
          <DollarSign className="w-5 h-5" />
          <span>Execute Batch Disbursement</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1" />
        </button>
        <p className="mt-6 text-[11px] text-pw-muted font-normal tracking-tight text-center italic opacity-60">
          * Manual audit override required for batch exceeding $500k.
        </p>
      </div>
    </div>
  );
};

export default WaterfallLedger;
