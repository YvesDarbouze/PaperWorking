'use client';

import React, { useMemo, useState } from 'react';
import { Project } from '@/types/schema';
import { computeAutopsyMetrics } from '@/lib/math/calculatorUtils';
import { Users, DollarSign, ArrowRight, CheckCircle2, Circle, RotateCcw } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { projectsService } from '@/lib/firebase/projects';
import toast from 'react-hot-toast';

interface CrowdfundingReconciliationProps {
  deal: Project;
}

export default function CrowdfundingReconciliation({ deal }: CrowdfundingReconciliationProps) {
  const investors = deal.fractionalInvestors || [];
  const projects = useProjectStore(state => state.projects);
  const setDeals = useProjectStore(state => state.setDeals);

  // Edit / Confirmation States
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [evidenceText, setEvidenceText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleConfirmPaid = async (investorId: string) => {
    if (!evidenceText.trim()) {
      toast.error('Please enter payment evidence or confirmation reference.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedInvestors = investors.map(inv => {
        if (inv.id === investorId) {
          return {
            ...inv,
            distributionStatus: 'confirmed' as const,
            distributionEvidence: evidenceText.trim()
          };
        }
        return inv;
      });

      // 1. Update Firestore
      await projectsService.updateProject(deal.id, {
        fractionalInvestors: updatedInvestors
      });

      // 2. Update Client Store
      const updatedDeals = projects.map(d => {
        if (d.id === deal.id) {
          return {
            ...d,
            fractionalInvestors: updatedInvestors
          };
        }
        return d;
      });
      setDeals(updatedDeals);

      toast.success('Recorded distribution entitlement payment (off-platform)', { icon: '✅' });
      setActiveRecordId(null);
      setEvidenceText('');
    } catch (err: any) {
      console.error('[CrowdfundingReconciliation] Failed to record payment:', err);
      toast.error('Failed to record payment: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPaid = async (investorId: string) => {
    setIsSubmitting(true);
    try {
      const updatedInvestors = investors.map(inv => {
        if (inv.id === investorId) {
          return {
            ...inv,
            distributionStatus: 'pending' as const,
            distributionEvidence: undefined
          };
        }
        return inv;
      });

      // 1. Update Firestore
      await projectsService.updateProject(deal.id, {
        fractionalInvestors: updatedInvestors
      });

      // 2. Update Client Store
      const updatedDeals = projects.map(d => {
        if (d.id === deal.id) {
          return {
            ...d,
            fractionalInvestors: updatedInvestors
          };
        }
        return d;
      });
      setDeals(updatedDeals);

      toast.success('Reset distribution entitlement payment status', { icon: '🔄' });
    } catch (err: any) {
      console.error('[CrowdfundingReconciliation] Failed to reset status:', err);
      toast.error('Failed to reset status: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
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
              Final distribution entitlements are calculated by adding the investor's original contribution to their proportional profit share.
            </p>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto font-sans">
          <table className="w-full text-left border-collapse">
            <thead className="border-b border-pw-border bg-pw-glass-bg/50 backdrop-blur-md sticky top-0 z-10">
              <tr className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                <th className="pb-3 text-left">Investor</th>
                <th className="pb-3 text-right">Equity %</th>
                <th className="pb-3 text-right">Original Contrib</th>
                <th className="pb-3 text-right">Profit Share</th>
                <th className="pb-3 text-right">Distribution Entitlement</th>
                <th className="pb-3 text-right">Confirmation (Decision F-1)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pw-border">
              {investors.map((inv) => {
                const profitShare = netProfit * (inv.equityPercentage / 100);
                const totalEntitlement = inv.contributionAmount + profitShare;
                const isProfit = profitShare >= 0;
                const isPaid = inv.distributionStatus === 'confirmed';

                return (
                  <React.Fragment key={inv.id}>
                    <tr className="hover:bg-pw-glass-bg/20 border-b border-pw-border last:border-b-0 transition-colors group">
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
                      <td className="py-4 px-2 text-right font-black font-mono text-text-primary text-base">
                        {fmtCurrency(totalEntitlement)}
                      </td>
                      <td className="py-4 pl-4 text-right">
                        <div className="flex items-center justify-end gap-2 text-xs">
                          {isPaid ? (
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5 text-pw-accent bg-pw-accent/10 px-2.5 py-1 rounded border border-pw-accent/20">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span className="font-bold tracking-tight uppercase text-[9px]">Confirmed Paid</span>
                              </div>
                              <button
                                onClick={() => handleResetPaid(inv.id)}
                                disabled={isSubmitting}
                                title="Reset confirmation status"
                                className="p-1 hover:bg-pw-glass-bg border border-pw-border text-text-secondary hover:text-text-primary rounded transition-colors"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setActiveRecordId(activeRecordId === inv.id ? null : inv.id);
                                setEvidenceText('');
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-pw-border hover:border-text-secondary text-[10px] font-bold uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors bg-pw-glass-bg"
                            >
                              <Circle className="w-3 h-3" />
                              Record Payment
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    
                    {/* Inline Record Form */}
                    {activeRecordId === inv.id && (
                      <tr className="bg-pw-black/20 border-b border-pw-border">
                        <td colSpan={6} className="py-4 px-6">
                          <div className="flex items-end gap-4 max-w-2xl ml-auto">
                            <div className="flex-1 space-y-1.5">
                              <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest">
                                Payment Evidence & Confirmation Reference
                              </label>
                              <input
                                type="text"
                                value={evidenceText}
                                onChange={(e) => setEvidenceText(e.target.value)}
                                placeholder="e.g. Wire reference #W89381 Chase Bank / settlement statement line 402"
                                className="w-full text-xs p-2 border border-pw-border bg-pw-black text-text-primary rounded font-mono placeholder:text-text-secondary/50 focus:border-text-secondary focus:outline-none"
                              />
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => {
                                  setActiveRecordId(null);
                                  setEvidenceText('');
                                }}
                                className="px-3 py-2 border border-pw-border text-[10px] font-bold uppercase tracking-wider text-text-secondary hover:text-text-primary rounded bg-pw-glass-bg"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleConfirmPaid(inv.id)}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-pw-accent text-pw-black text-[10px] font-black uppercase tracking-wider rounded hover:bg-pw-accent/90 disabled:opacity-50"
                              >
                                Confirm Paid
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
                <td className="py-3 text-right font-black font-mono text-lg text-text-primary" colSpan={2}>
                  {fmtCurrency(investors.reduce((sum, inv) => sum + (inv.contributionAmount + (netProfit * (inv.equityPercentage / 100))), 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      
      {/* ── Footer ── */}
      <div className="bg-pw-glass-bg/20 border-t border-pw-border p-4 flex items-center justify-between">
         <p className="text-[9px] font-bold text-text-secondary uppercase tracking-widest leading-relaxed max-w-[70%]">
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
