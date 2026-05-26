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
    <div className="glass-card rounded-2xl overflow-hidden border border-white/5 shadow-none mt-8">
      {/* ── Header ── */}
      <div className="bg-surface-container-highest/30 px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2 text-pw-black">
          <Users className="w-5 h-5" />
          <h2 className="font-label-md text-label-md text-pw-black uppercase tracking-wider">Crowdfunding Reconciliation</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-label-sm text-label-sm text-pw-muted uppercase tracking-wider">
            Investors: {investors.length}
          </span>
        </div>
      </div>

      <div className="p-8">
        <div className="mb-6 pb-6 border-b border-white/5 flex items-end justify-between">
          <div>
            <p className="font-label-sm text-label-sm text-pw-muted uppercase tracking-wider mb-1">
              Realized Net Profit
            </p>
            <p className={`text-3xl font-black font-mono tracking-tighter ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {fmtCurrency(netProfit)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-normal text-pw-muted max-w-[250px] leading-relaxed">
              Final payouts are calculated by adding the investor's original contribution to their proportional profit share.
            </p>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="border-b border-white/5 bg-surface-container-highest/50 backdrop-blur-md sticky top-0 z-10">
              <tr className="font-label-md text-label-md text-outline uppercase tracking-wider">
                <th className="pb-3 text-left">Investor</th>
                <th className="pb-3 text-right">Equity %</th>
                <th className="pb-3 text-right">Original Contrib</th>
                <th className="pb-3 text-right">Profit Share</th>
                <th className="pb-3 text-right">Final Wire Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {investors.map((inv) => {
                const profitShare = netProfit * (inv.equityPercentage / 100);
                const totalPayout = inv.contributionAmount + profitShare;
                const isProfit = profitShare >= 0;

                return (
                  <tr key={inv.id} className="hover:bg-white/5 border-b border-white/5 last:border-b-0 transition-colors group">
                    <td className="py-4 pr-4">
                      <p className="text-sm font-bold text-pw-black">{inv.name}</p>
                      <p className="text-[10px] font-medium text-pw-muted font-mono">{inv.email}</p>
                    </td>
                    <td className="py-4 px-2 text-right">
                      <span className="text-xs font-bold font-mono text-pw-black bg-surface-container-high px-2 py-1 rounded border border-white/5">
                        {fmtPercent(inv.equityPercentage)}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-right">
                      <span className="text-sm font-bold font-mono text-pw-muted">
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
                        <ArrowRight className="w-3 h-3 text-pw-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="text-lg font-black font-mono text-pw-black">
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
              <tr className="border-t border-white/5 bg-surface-container-low">
                <td className="py-3 font-label-md text-label-md uppercase tracking-wider text-pw-black">Totals</td>
                <td className="py-3 text-right font-black font-mono text-xs text-pw-black">
                  {fmtPercent(investors.reduce((sum, inv) => sum + inv.equityPercentage, 0))}
                </td>
                <td className="py-3 text-right font-black font-mono text-sm text-pw-muted">
                  {fmtCurrency(investors.reduce((sum, inv) => sum + inv.contributionAmount, 0))}
                </td>
                <td className={`py-3 text-right font-black font-mono text-sm ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmtCurrency(netProfit * (investors.reduce((sum, inv) => sum + inv.equityPercentage, 0) / 100))}
                </td>
                <td className="py-3 text-right font-black font-mono text-lg text-pw-black">
                  {fmtCurrency(investors.reduce((sum, inv) => sum + (inv.contributionAmount + (netProfit * (inv.equityPercentage / 100))), 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      
      {/* ── Footer ── */}
      <div className="bg-surface-container-low border-t border-white/5 p-4 flex items-center justify-between">
         <p className="text-[9px] font-bold text-pw-muted uppercase tracking-widest">
           Reconciliation automatically calculated via Phase 4 Net Engine output.
         </p>
         <button className="rounded-full border border-white/5 bg-surface-container-high hover:bg-surface-container-highest text-pw-black text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2 transition-colors active:scale-95 flex items-center gap-2">
           <DollarSign className="w-3 h-3" />
           Export Wire Instructions
         </button>
      </div>
    </div>
  );
}
