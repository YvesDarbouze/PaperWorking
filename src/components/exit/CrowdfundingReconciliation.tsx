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
    <div className="glass-card border border-pw-border mt-8">
      {/* ── Header ── */}
      <div className="bg-pw-black px-6 py-4 flex items-center justify-between border-b border-pw-border text-pw-white">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          <h2 className="text-xs font-black tracking-[0.3em] uppercase">Crowdfunding Reconciliation</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
            Investors: {investors.length}
          </span>
        </div>
      </div>

      <div className="p-8">
        <div className="mb-6 pb-6 border-b border-pw-border flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
              Realized Net Profit
            </p>
            <p className={`text-3xl font-black font-mono tracking-tighter ${netProfit >= 0 ? 'text-pw-accent' : 'text-color-error'}`}>
              {fmtCurrency(netProfit)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-normal text-text-secondary max-w-[250px] leading-relaxed">
              Final payouts are calculated by adding the investor's original contribution to their proportional profit share.
            </p>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="border-b border-pw-border bg-pw-glass-bg/50 backdrop-blur-md sticky top-0 z-10">
              <tr className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                <th className="pb-3 text-left">Investor</th>
                <th className="pb-3 text-right">Equity %</th>
                <th className="pb-3 text-right">Original Contrib</th>
                <th className="pb-3 text-right">Profit Share</th>
                <th className="pb-3 text-right">Final Wire Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pw-border">
              {investors.map((inv) => {
                const profitShare = netProfit * (inv.equityPercentage / 100);
                const totalPayout = inv.contributionAmount + profitShare;
                const isProfit = profitShare >= 0;

                return (
                  <tr key={inv.id} className="hover:bg-pw-glass-bg/20 border-b border-pw-border last:border-b-0 transition-colors group">
                    <td className="py-4 pr-4">
                      <p className="text-sm font-semibold text-text-primary">{inv.name}</p>
                      <p className="text-[10px] font-medium text-text-secondary font-mono">{inv.email}</p>
                    </td>
                    <td className="py-4 px-2 text-right">
                      <span className="text-xs font-bold font-mono text-text-primary bg-pw-glass-bg px-2 py-1 border border-pw-border">
                        {fmtPercent(inv.equityPercentage)}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-right">
                      <span className="text-sm font-bold font-mono text-text-secondary">
                        {fmtCurrency(inv.contributionAmount)}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-right">
                      <span className={`text-sm font-bold font-mono ${isProfit ? 'text-pw-accent' : 'text-color-error'}`}>
                        {isProfit ? '+' : '-'}{fmtCurrency(Math.abs(profitShare))}
                      </span>
                    </td>
                    <td className="py-4 pl-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <ArrowRight className="w-3 h-3 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
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
              <tr className="border-t border-pw-border bg-pw-glass-bg/30">
                <td className="py-3 font-bold text-[10px] uppercase tracking-wider text-text-primary">Totals</td>
                <td className="py-3 text-right font-black font-mono text-xs text-text-primary">
                  {fmtPercent(investors.reduce((sum, inv) => sum + inv.equityPercentage, 0))}
                </td>
                <td className="py-3 text-right font-black font-mono text-sm text-text-secondary">
                  {fmtCurrency(investors.reduce((sum, inv) => sum + inv.contributionAmount, 0))}
                </td>
                <td className={`py-3 text-right font-black font-mono text-sm ${netProfit >= 0 ? 'text-pw-accent' : 'text-color-error'}`}>
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
      <div className="bg-pw-glass-bg/20 border-t border-pw-border p-4 flex items-center justify-between">
         <p className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">
           Reconciliation automatically calculated via Phase 4 Net Engine output. Distribution movements are recorded off-platform per Decision F-1.
         </p>
         <button className="pw-btn pw-btn--secondary pw-btn--sm text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2 transition-colors flex items-center gap-2">
           <DollarSign className="w-3 h-3 text-pw-accent" />
           Export Wire Instructions
         </button>
      </div>
    </div>
  );
}
