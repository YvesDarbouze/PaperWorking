'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { DealCardData } from './DealCard';
import { Button } from '@/components/ui/Button';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
  formatMultiple,
  formatHoldPeriod,
} from '@/lib/format';

export interface DealsDenseTableProps {
  deals: DealCardData[];
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  className?: string;
  onViewCalculatorModal?: (deal: DealCardData) => void;
  onExpressInterest?: (deal: DealCardData) => void;
  interestedDealIds?: string[];
  initialExpandedRowId?: string | null;
}

export default function DealsDenseTable({
  deals,
  className = '',
  onViewCalculatorModal,
  onExpressInterest,
  interestedDealIds,
  initialExpandedRowId = null,
}: DealsDenseTableProps) {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(initialExpandedRowId);

  return (
    <div
      data-testid="deals-dense-table"
      className={`w-full overflow-x-auto rounded-2xl border border-white/10 bg-[#121014] shadow-xl ${className}`}
    >
      <table className="w-full text-left text-xs border-collapse">
        <thead className="sticky top-0 z-20 border-b border-white/10 bg-[#161318] text-[10px] font-bold uppercase tracking-wider text-[#9E9DA0]">
          <tr>
            <th className="w-10 py-3.5 pl-3 pr-1 text-center font-bold"></th>
            <th className="py-3.5 pl-2 pr-2 font-bold">Deal / Asset</th>
            <th className="px-3 py-3.5 font-bold">Market</th>
            <th className="px-3 py-3.5 font-bold">Asset Class</th>
            <th className="px-3 py-3.5 text-right font-bold">Target IRR</th>
            <th className="px-3 py-3.5 text-right font-bold">Eq Multiple</th>
            <th className="px-3 py-3.5 text-right font-bold">Hold Period</th>
            <th className="px-3 py-3.5 text-right font-bold">Min Check</th>
            <th className="px-3 py-3.5 text-right font-bold">Funding %</th>
            <th className="px-3 py-3.5 text-center font-bold">Status</th>
            <th className="py-3.5 pl-2 pr-4 text-right font-bold">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 font-sans">
          {deals.map((deal) => {
            const name = deal.propertyName || deal.name || deal.address.split(',')[0] || 'Deal';
            const detailUrl = `/marketplace/${deal.slug || deal.id}`;
            const target = deal.fundingTarget ?? deal.target ?? ((deal.purchasePrice ?? 500_000) + 100_000);
            const committed = deal.committedAmount ?? deal.committed ?? 0;
            const progressPercent = target > 0 ? Math.min(100, Math.round((committed / target) * 100)) : 0;
            const targetIrr = deal.targetIrr ?? deal.projectedRoi ?? deal.roi ?? 16.5;
            const equityMultiple = deal.equityMultiple ?? 1.75;
            const holdPeriod = deal.holdPeriod ?? '3–5 Years';
            const minInvestment = deal.minInvestment ?? 25_000;
            const normStatus = (deal.status || 'published').toLowerCase();
            const isClosingSoon = normStatus === 'closing_soon' || progressPercent >= 85;
            const isFunded = normStatus === 'funded' || progressPercent >= 100;
            const statusLabel = isFunded
              ? 'Funded'
              : isClosingSoon
                ? 'Closing Soon'
                : normStatus === 'funding'
                  ? 'Live Funding'
                  : 'Open';

            const statusBadge = isFunded
              ? 'border-white/10 bg-white/10 text-white/70'
              : isClosingSoon
                ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                : 'border-[var(--status-live)]/40 bg-[var(--accent-subtle)] text-[var(--status-live)]';

            // Original Deal Calculator Baseline Outputs
            const calc = deal.calculatorResults;
            const purchasePrice = calc?.purchasePrice ?? deal.purchasePrice ?? deal.price ?? 485_000;
            const rehabBudget = calc?.rehabBudget ?? (deal as any).rehabCost ?? 0;
            const arv = calc?.arv ?? (purchasePrice > 0 ? purchasePrice + (rehabBudget > 0 ? Math.round(rehabBudget * 1.5) : 0) : 0);
            const cashRequired = calc?.cashRequired ?? Math.round(purchasePrice * 0.25 + rehabBudget);
            const annualNoi = calc?.netOperatingIncome ?? Math.round(purchasePrice * 0.008 * 12 * 0.65);
            const capRate = calc?.capRateOnCost ?? ((annualNoi / Math.max(1, purchasePrice + rehabBudget)) * 100);
            const isInterested = Boolean(
              interestedDealIds?.includes(deal.id) || (deal.slug && interestedDealIds?.includes(deal.slug))
            );
            const isExpanded = expandedRowId === deal.id || (Boolean(deal.slug) && expandedRowId === deal.slug);

            return (
              <React.Fragment key={deal.id}>
                <tr
                  data-testid={`dense-row-${deal.slug || deal.id}`}
                  className={`group transition-colors hover:bg-white/[0.04] ${isExpanded ? 'bg-white/[0.03]' : ''}`}
                >
                  {/* Expand / Collapse Chevron */}
                  <td className="w-10 py-3 pl-3 pr-1 text-center">
                    <button
                      type="button"
                      data-testid={`dense-expand-row-btn-${deal.id}`}
                      onClick={() => setExpandedRowId(isExpanded ? null : deal.id)}
                      className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-none text-white/50 hover:text-white hover:bg-white/10 transition"
                      aria-label={isExpanded ? 'Collapse Deal Calculator results' : 'Expand Deal Calculator results'}
                      title={isExpanded ? 'Collapse Deal Calculator results' : 'Expand Deal Calculator results'}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                  </td>

                  {/* Deal Title & Operator */}
                  <td className="py-3 pl-2 pr-2">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={detailUrl}
                        className="font-bold text-[#fdfffc] group-hover:text-[var(--accent)] transition-colors no-underline block"
                      >
                        {name}
                      </Link>
                      {isInterested && (
                        <span
                          data-testid="dense-interest-badge"
                          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          title="Interest registered with operator"
                        >
                          <span className="material-symbols-outlined text-[10px]">check</span>
                          <span>Interested</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-[#9E9DA0] mt-0.5">
                      <span className="truncate max-w-[140px]">
                        {deal.creatorName || 'Verified Operator'}
                      </span>
                      {(() => {
                        const parentProjectId = deal.projectId || deal.projects?.[0]?.id;
                        const parentProjectName =
                          deal.projectName ||
                          deal.projects?.[0]?.name ||
                          (parentProjectId ? `Project #${parentProjectId.slice(-6)}` : null);
                        if (!parentProjectName) return null;
                        return (
                          <>
                            <span>·</span>
                            {parentProjectId ? (
                              <Link
                                href={`/project/${parentProjectId}`}
                                data-testid="dense-overarching-project-link"
                                className="inline-flex items-center gap-0.5 text-white/70 hover:text-white font-medium hover:underline transition truncate max-w-[140px]"
                                title={`View Overarching Project: ${parentProjectName}`}
                              >
                                <span className="material-symbols-outlined text-[11px] text-neutral-400">folder</span>
                                <span className="truncate">Project: {parentProjectName}</span>
                              </Link>
                            ) : (
                              <span className="truncate max-w-[140px]">Project: {parentProjectName}</span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </td>

                  {/* Market */}
                  <td className="px-3 py-3 text-[#fdfffc]/80 whitespace-nowrap">
                    {deal.city && deal.state ? `${deal.city}, ${deal.state}` : deal.address}
                  </td>

                  {/* Asset Class & Strategy */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-[#fdfffc]/90">
                      {deal.assetClass || 'Multi-family'}
                    </span>
                  </td>

                  {/* Target IRR */}
                  <td className="px-3 py-3 text-right font-mono font-bold text-[var(--accent)] whitespace-nowrap">
                    {formatPercent(targetIrr)}
                  </td>

                  {/* Equity Multiple */}
                  <td className="px-3 py-3 text-right font-mono font-bold text-[#fdfffc] whitespace-nowrap">
                    {formatMultiple(equityMultiple)}
                  </td>

                  {/* Hold Period */}
                  <td className="px-3 py-3 text-right font-mono text-[#fdfffc]/80 whitespace-nowrap">
                    {formatHoldPeriod(holdPeriod)}
                  </td>

                  {/* Min Investment */}
                  <td className="px-3 py-3 text-right font-mono font-bold text-[#fdfffc] whitespace-nowrap">
                    {formatCurrencyCompact(minInvestment)}
                  </td>

                  {/* Funding % */}
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-[var(--accent)]"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-[#fdfffc] text-[11px]">
                        {progressPercent}%
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadge}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {statusLabel}
                    </span>
                  </td>

                  {/* Action CTA & Choose to be Interested */}
                  <td className="py-3 pl-2 pr-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {onViewCalculatorModal && (
                        <button
                          type="button"
                          data-testid={`dense-inspect-calc-btn-${deal.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onViewCalculatorModal(deal);
                          }}
                          className="inline-flex items-center gap-1 rounded-none border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/15 transition min-h-[44px]"
                          title="Inspect original Deal Calculator results in expandable modal"
                        >
                          <span className="material-symbols-outlined text-[15px]">calculate</span>
                          <span className="hidden xl:inline">Calculator</span>
                        </button>
                      )}

                      <button
                        type="button"
                        data-testid={`dense-express-interest-btn-${deal.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onExpressInterest?.(deal);
                        }}
                        className={`inline-flex items-center gap-1 rounded-none px-2.5 py-1.5 text-xs font-semibold min-h-[44px] transition ${
                          isInterested
                            ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                            : 'bg-white text-neutral-950 hover:bg-neutral-200'
                        }`}
                        title={isInterested ? 'Investment interest registered with operator' : 'Choose to be interested in investing into the Project'}
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {isInterested ? 'check_circle' : 'how_to_reg'}
                        </span>
                        <span>{isInterested ? 'Interested' : 'Interested in Investing'}</span>
                      </button>

                      <Button
                        href={detailUrl}
                        variant="secondary"
                        size="sm"
                        className="!px-3 !py-1 text-xs min-h-[44px]"
                      >
                        View →
                      </Button>
                    </div>
                  </td>
                </tr>

                {/* Inline Expandable Row: Original Deal Calculator Results Breakdown */}
                {isExpanded && (
                  <tr
                    data-testid={`dense-expanded-content-${deal.id}`}
                    className="bg-black/60 border-b border-white/10"
                  >
                    <td colSpan={11} className="p-4 sm:p-5">
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-white/60">calculate</span>
                            <span className="text-xs font-bold uppercase tracking-wider text-white">
                              Original Deal Calculator Underwriting Baseline
                            </span>
                            <span className="text-[11px] font-mono text-white/40">
                              (Baseline Underwriting)
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {onViewCalculatorModal && (
                              <button
                                type="button"
                                data-testid="dense-open-calc-modal-btn"
                                onClick={() => onViewCalculatorModal(deal)}
                                className="inline-flex items-center gap-1 rounded-none border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition min-h-[44px]"
                              >
                                <span>Expandable Calculator Modal</span>
                                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                              </button>
                            )}

                            <button
                              type="button"
                              data-testid="dense-expand-invest-btn"
                              onClick={() => onExpressInterest?.(deal)}
                              className="inline-flex items-center gap-1.5 rounded-none bg-white px-3 py-1.5 text-xs font-bold text-neutral-950 hover:bg-neutral-200 transition min-h-[44px]"
                            >
                              <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                              <span>Interested in Investing into this Project</span>
                            </button>
                          </div>
                        </div>

                        {/* 6-Metric Deal Calculator Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                          <div className="rounded-none border border-white/10 bg-white/[0.02] p-2.5">
                            <span className="text-[10px] uppercase font-mono text-white/40 block">Purchase Price</span>
                            <span className="font-mono font-bold text-white text-sm">
                              {formatCurrency(purchasePrice)}
                            </span>
                          </div>
                          <div className="rounded-none border border-white/10 bg-white/[0.02] p-2.5">
                            <span className="text-[10px] uppercase font-mono text-white/40 block">Rehab Budget</span>
                            <span className="font-mono font-bold text-white text-sm">
                              {formatCurrency(rehabBudget)}
                            </span>
                          </div>
                          <div className="rounded-none border border-white/10 bg-white/[0.02] p-2.5">
                            <span className="text-[10px] uppercase font-mono text-white/40 block">After Repair Value (ARV)</span>
                            <span className="font-mono font-bold text-white text-sm">
                              {formatCurrency(arv)}
                            </span>
                          </div>
                          <div className="rounded-none border border-white/10 bg-white/[0.02] p-2.5">
                            <span className="text-[10px] uppercase font-mono text-white/40 block">Cash Required</span>
                            <span className="font-mono font-bold text-white text-sm">
                              {formatCurrency(cashRequired)}
                            </span>
                          </div>
                          <div className="rounded-none border border-white/10 bg-white/[0.02] p-2.5">
                            <span className="text-[10px] uppercase font-mono text-white/40 block">Target IRR</span>
                            <span className="font-mono font-bold text-white text-sm">
                              {formatPercent(targetIrr / 100)}
                            </span>
                          </div>
                          <div className="rounded-none border border-white/10 bg-white/[0.02] p-2.5">
                            <span className="text-[10px] uppercase font-mono text-white/40 block">Equity Multiple</span>
                            <span className="font-mono font-bold text-white text-sm">
                              {`${equityMultiple}x`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
