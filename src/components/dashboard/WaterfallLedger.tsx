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
    <div className="glass-card rounded-2xl flex flex-col h-full overflow-hidden border border-white/5">
      <div className="px-8 py-10 flex justify-between items-end shrink-0 border-b border-white/5">
        <div className="space-y-2">
          <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Payee Waterfall</p>
          <h3 className="text-3xl font-normal text-pw-black tracking-tighter">Settlement Ledger</h3>
          <p className="text-sm text-pw-muted font-normal tracking-tight">Track and confirm payouts to partners, lenders, and vendors at closing.</p>
        </div>
        <div className="text-right">
          <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider mb-2">Total Owed</p>
          <p className="text-2xl font-medium text-pw-black tracking-tighter">{formatCentsToDollars(totalAmount)}</p>
        </div>
      </div>

      {/* Settlement Progress Strip */}
      <div className="h-1 w-full bg-surface-container-high flex">
         <div 
           className="h-full bg-pw-black transition-all duration-1000 ease-in-out" 
           style={{ width: `${progressPercent}%` }} 
         />
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        <table className="w-full text-left border-collapse mt-4">
          <thead className="border-b border-white/5 bg-surface-container-highest/50 backdrop-blur-md sticky top-0 z-10">
            <tr className="font-label-md text-label-md text-outline uppercase tracking-wider">
              <th className="px-6 py-4 text-left">Payee</th>
              <th className="px-6 py-4 text-left">Allocation</th>
              <th className="px-6 py-4 text-right">Value</th>
              <th className="px-6 py-4 text-center w-24">Confirm</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {payouts.map((payout) => {
              const isSettled = payout.status === 'confirmed';
              return (
                <tr 
                  key={payout.id} 
                  className={`group transition-all duration-200 border-b border-white/5 last:border-b-0 hover:bg-white/5 ${isSettled ? 'bg-white/5' : ''}`}
                >
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isSettled ? 'bg-pw-black text-pw-white' : 'bg-surface-container text-pw-muted'
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
                      isSettled ? 'bg-pw-black text-pw-white' : 'bg-surface-container text-pw-muted border border-white/5'
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
                          : 'text-pw-muted hover:bg-white/5 hover:text-pw-black'
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

      <div className="p-10 bg-bg-surface border-t border-border-accent/10 shrink-0">
        <button className="ag-button w-full space-x-4">
          <DollarSign className="w-5 h-5" />
          <span>Send All Payouts</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1" />
        </button>
        <p className="mt-6 text-[11px] text-text-secondary font-normal tracking-tight text-center italic opacity-60">
          * Manual audit override required for batch exceeding $500k.
        </p>
      </div>
    </div>
  );
};

export default WaterfallLedger;
