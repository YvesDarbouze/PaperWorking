'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import { computeAutopsyMetrics } from '@/lib/math/calculatorUtils';
import { Users, DollarSign, ArrowRight } from 'lucide-react';

interface CrowdfundingReconciliationProps {
  deal: Project;
}

export default function CrowdfundingReconciliation({ deal }: CrowdfundingReconciliationProps) {
  const investors = deal.fractionalInvestors || [];

  // If there are no fractional investors, don't render the component
  if (investors.length === 0) {
    return null;
  }

  // Calculate Net Profit using the exact exit math from Phase 4
  const metrics = useMemo(() => computeAutopsyMetrics(deal), [deal]);
  const netProfit = metrics.netProfit;

  // Format currency
  const fmtCurrency = (val: number) => {
    return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  // Format percent
  const fmtPercent = (val: number) => {
    return val.toFixed(2) + '%';
  };

  return (
    <div className="bg-bg-surface border border-pw-black shadow-xl overflow-hidden mt-8">
      {/* ── Header ── */}
      <div className="bg-pw-black px-6 py-4 flex items-center justify-between border-b border-pw-white/10">
        <div className="flex items-center gap-2 text-pw-white">
          <Users className="w-5 h-5" />
          <h2 className="text-sm font-black uppercase tracking-[0.2em]">Crowdfunding Reconciliation</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.15em]">
            Investors: {investors.length}
          </span>
        </div>
      </div>

      <div className="p-8">
        <div className="mb-6 pb-6 border-b border-border-subtle flex items-end justify-between">
          <div>
            <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1">
              Realized Net Profit
            </p>
            <p className={`text-3xl font-black font-mono tracking-tighter ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {fmtCurrency(netProfit)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest max-w-[250px]">
              Final payouts are calculated by adding the investor's original contribution to their proportional profit share.
            </p>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-pw-black">
                <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-text-secondary">Investor</th>
                <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-text-secondary text-right">Equity %</th>
                <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-text-secondary text-right">Original Contrib</th>
                <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-text-secondary text-right">Profit Share</th>
                <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-text-secondary text-right">Final Wire Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {investors.map((inv) => {
                const profitShare = netProfit * (inv.equityPercentage / 100);
                const totalPayout = inv.contributionAmount + profitShare;
                const isProfit = profitShare >= 0;

                return (
                  <tr key={inv.id} className="hover:bg-bg-primary/50 transition-colors group">
                    <td className="py-4 pr-4">
                      <p className="text-sm font-bold text-text-primary">{inv.name}</p>
                      <p className="text-[10px] font-medium text-text-secondary font-mono">{inv.email}</p>
                    </td>
                    <td className="py-4 px-2 text-right">
                      <span className="text-xs font-bold font-mono text-text-primary bg-bg-primary px-2 py-1 rounded border border-border-subtle">
                        {fmtPercent(inv.equityPercentage)}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-right">
                      <span className="text-sm font-bold font-mono text-text-secondary">
                        {fmtCurrency(inv.contributionAmount)}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-right">
                      <span className={`text-sm font-bold font-mono ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                        {isProfit ? '+' : '-'}{fmtCurrency(Math.abs(profitShare))}
                      </span>
                    </td>
                    <td className="py-4 pl-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <ArrowRight className="w-3 h-3 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="text-lg font-black font-mono text-text-primary">
                          {fmtCurrency(totalPayout)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* ── Totals Footer ── */}
            <tfoot>
              <tr className="border-t-2 border-pw-black bg-bg-primary">
                <td className="py-3 font-black text-xs uppercase tracking-widest text-text-primary">Totals</td>
                <td className="py-3 text-right font-black font-mono text-xs text-text-primary">
                  {fmtPercent(investors.reduce((sum, inv) => sum + inv.equityPercentage, 0))}
                </td>
                <td className="py-3 text-right font-black font-mono text-sm text-text-secondary">
                  {fmtCurrency(investors.reduce((sum, inv) => sum + inv.contributionAmount, 0))}
                </td>
                <td className={`py-3 text-right font-black font-mono text-sm ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmtCurrency(netProfit * (investors.reduce((sum, inv) => sum + inv.equityPercentage, 0) / 100))}
                </td>
                <td className="py-3 text-right font-black font-mono text-lg text-text-primary">
                  {fmtCurrency(investors.reduce((sum, inv) => sum + (inv.contributionAmount + (netProfit * (inv.equityPercentage / 100))), 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      
      {/* ── Footer ── */}
      <div className="bg-bg-primary border-t border-border-subtle p-4 flex items-center justify-between">
         <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">
           Reconciliation automatically calculated via Phase 4 Net Engine output.
         </p>
         <button className="bg-pw-black text-pw-white text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2 hover:bg-pw-accent transition-colors active:scale-95 flex items-center gap-2">
           <DollarSign className="w-3 h-3" />
           Export Wire Instructions
         </button>
      </div>
    </div>
  );
}
