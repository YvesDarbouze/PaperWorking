'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CaretUp,
  CaretDown,
  Check,
  Folder,
  Calculator,
  CheckCircle,
  UserPlus,
  ArrowSquareOut,
  Briefcase,
} from '@phosphor-icons/react';
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
  onOfferServices?: (deal: DealCardData) => void;
  interestedDealIds?: string[];
  initialExpandedRowId?: string | null;
  isVendor?: boolean;
}

export default function DealsDenseTable({
  deals,
  className = '',
  onViewCalculatorModal,
  onExpressInterest,
  onOfferServices,
  interestedDealIds,
  initialExpandedRowId = null,
  isVendor = false,
}: DealsDenseTableProps) {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(initialExpandedRowId);

  return (
    <div
      data-testid="deals-dense-table"
      className={`w-full overflow-x-auto rounded-none border border-neutral-800 bg-neutral-950 shadow-xl ${className}`}
    >
      <table className="w-full text-left text-xs border-collapse">
        <thead className="sticky top-0 z-20 border-b border-neutral-800 bg-neutral-900 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          <tr>
            <th className="w-10 py-3.5 pl-3 pr-1 text-center font-semibold"></th>
            <th className="py-3.5 pl-2 pr-2 font-semibold">Deal / Asset</th>
            <th className="px-3 py-3.5 font-semibold">Market</th>
            <th className="px-3 py-3.5 font-semibold">Asset Class</th>
            <th className="px-3 py-3.5 text-right font-semibold">Target IRR</th>
            <th className="px-3 py-3.5 text-right font-semibold">Eq Multiple</th>
            <th className="px-3 py-3.5 text-right font-semibold">Hold Period</th>
            <th className="px-3 py-3.5 text-right font-semibold">Min Check</th>
            <th className="px-3 py-3.5 text-right font-semibold">Funding %</th>
            <th className="px-3 py-3.5 text-center font-semibold">Status</th>
            <th className="py-3.5 pl-2 pr-4 text-right font-semibold">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800 font-sans">
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
              ? 'border-neutral-800 bg-neutral-900 text-neutral-400'
              : isClosingSoon
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400';

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
                  className={`group transition-colors hover:bg-neutral-900/40 ${isExpanded ? 'bg-neutral-900/30' : ''}`}
                >
                  {/* Expand / Collapse Chevron */}
                  <td className="w-10 py-3 pl-3 pr-1 text-center">
                    <button
                      type="button"
                      data-testid={`dense-expand-row-btn-${deal.id}`}
                      onClick={() => setExpandedRowId(isExpanded ? null : deal.id)}
                      className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-none text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
                      aria-label={isExpanded ? 'Collapse Deal Calculator results' : 'Expand Deal Calculator results'}
                      title={isExpanded ? 'Collapse Deal Calculator results' : 'Expand Deal Calculator results'}
                    >
                      {isExpanded ? (
                        <CaretUp className="h-4 w-4" />
                      ) : (
                        <CaretDown className="h-4 w-4" />
                      )}
                    </button>
                  </td>

                  {/* Deal Title & Operator */}
                  <td className="py-3 pl-2 pr-2">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={detailUrl}
                        className="font-semibold text-neutral-100 group-hover:text-white transition-colors no-underline block"
                      >
                        {name}
                      </Link>
                      {isInterested && (
                        <span
                          data-testid="dense-interest-badge"
                          className="inline-flex items-center gap-0.5 rounded-none px-1.5 py-0.5 text-[9px] font-semibold uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                          title="Interest registered with operator"
                        >
                          <Check className="h-2.5 w-2.5" />
                          <span>Interested</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-neutral-400 mt-0.5">
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
                                className="inline-flex items-center gap-0.5 text-neutral-300 hover:text-white font-medium hover:underline transition truncate max-w-[140px]"
                                title={`View Overarching Project: ${parentProjectName}`}
                              >
                                <Folder className="h-3 w-3 text-neutral-400" />
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
                  <td className="px-3 py-3 text-neutral-300 whitespace-nowrap">
                    {deal.city && deal.state ? `${deal.city}, ${deal.state}` : deal.address}
                  </td>

                  {/* Asset Class & Strategy */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="rounded-none border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[11px] font-medium text-neutral-300">
                      {deal.assetClass || 'Multi-family'}
                    </span>
                  </td>

                  {/* Target IRR */}
                  <td className="px-3 py-3 text-right font-mono font-semibold text-neutral-100 whitespace-nowrap">
                    {formatPercent(targetIrr)}
                  </td>

                  {/* Equity Multiple */}
                  <td className="px-3 py-3 text-right font-mono font-semibold text-neutral-100 whitespace-nowrap">
                    {formatMultiple(equityMultiple)}
                  </td>

                  {/* Hold Period */}
                  <td className="px-3 py-3 text-right font-mono text-neutral-400 whitespace-nowrap">
                    {formatHoldPeriod(holdPeriod)}
                  </td>

                  {/* Min Investment */}
                  <td className="px-3 py-3 text-right font-mono font-semibold text-neutral-100 whitespace-nowrap">
                    {formatCurrencyCompact(minInvestment)}
                  </td>

                  {/* Funding % */}
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="h-1.5 w-12 overflow-hidden rounded-none bg-neutral-800">
                        <div
                          className="h-full rounded-none bg-neutral-100"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span className="font-mono font-semibold text-neutral-100 text-[11px]">
                        {progressPercent}%
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 rounded-none border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadge}`}>
                      <span className="h-1.5 w-1.5 rounded-none bg-current" />
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
                          className="inline-flex items-center gap-1 rounded-none border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-800 transition min-h-[44px]"
                          title="Inspect original Deal Calculator results in expandable modal"
                        >
                          <Calculator className="h-3.5 w-3.5 text-neutral-400" />
                          <span className="hidden xl:inline">Calculator</span>
                        </button>
                      )}

                      {isVendor ? (
                        <button
                          type="button"
                          data-testid={`dense-offer-services-btn-${deal.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onOfferServices?.(deal);
                          }}
                          className="inline-flex items-center gap-1 rounded-none px-2.5 py-1.5 text-xs font-semibold min-h-[44px] transition bg-neutral-100 text-neutral-950 hover:bg-white"
                          title="Offer trade or professional services to deal operator"
                        >
                          <Briefcase className="h-3.5 w-3.5" />
                          <span>Offer Services</span>
                        </button>
                      ) : (
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
                              : 'bg-neutral-100 text-neutral-950 hover:bg-white'
                          }`}
                          title={isInterested ? 'Investment interest registered with operator' : 'Choose to be interested in investing into the Project'}
                        >
                          {isInterested ? (
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <UserPlus className="h-3.5 w-3.5" />
                          )}
                          <span>{isInterested ? 'Interested' : 'Interested in Investing'}</span>
                        </button>
                      )}

                      <Button
                        href={detailUrl}
                        variant="secondary"
                        size="sm"
                        className="!px-3 !py-1 text-xs min-h-[44px] rounded-none"
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
                    className="bg-neutral-950 border-b border-neutral-800"
                  >
                    <td colSpan={11} className="p-4 sm:p-5">
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-2.5">
                          <div className="flex items-center gap-2">
                            <Calculator className="h-4 w-4 text-neutral-400" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-200">
                              Original Deal Calculator Underwriting Baseline
                            </span>
                            <span className="text-[11px] font-mono text-neutral-400">
                              (Baseline Underwriting)
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {onViewCalculatorModal && (
                              <button
                                type="button"
                                data-testid="dense-open-calc-modal-btn"
                                onClick={() => onViewCalculatorModal(deal)}
                                className="inline-flex items-center gap-1 rounded-none border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-800 transition min-h-[44px]"
                              >
                                <span>Expandable Calculator Modal</span>
                                <ArrowSquareOut className="h-3.5 w-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              data-testid="dense-expand-invest-btn"
                              onClick={() => onExpressInterest?.(deal)}
                              className="inline-flex items-center gap-1.5 rounded-none bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-white transition min-h-[44px]"
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                              <span>Interested in Investing into this Project</span>
                            </button>
                          </div>
                        </div>

                        {/* 6-Metric Deal Calculator Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                          <div className="rounded-none border border-neutral-800 bg-neutral-900/30 p-2.5">
                            <span className="text-[10px] uppercase font-mono text-neutral-400 block">Purchase Price</span>
                            <span className="font-mono font-semibold text-neutral-100 text-sm">
                              {formatCurrency(purchasePrice)}
                            </span>
                          </div>
                          <div className="rounded-none border border-neutral-800 bg-neutral-900/30 p-2.5">
                            <span className="text-[10px] uppercase font-mono text-neutral-400 block">Rehab Budget</span>
                            <span className="font-mono font-semibold text-neutral-100 text-sm">
                              {formatCurrency(rehabBudget)}
                            </span>
                          </div>
                          <div className="rounded-none border border-neutral-800 bg-neutral-900/30 p-2.5">
                            <span className="text-[10px] uppercase font-mono text-neutral-400 block">After Repair Value (ARV)</span>
                            <span className="font-mono font-semibold text-neutral-100 text-sm">
                              {formatCurrency(arv)}
                            </span>
                          </div>
                          <div className="rounded-none border border-neutral-800 bg-neutral-900/30 p-2.5">
                            <span className="text-[10px] uppercase font-mono text-neutral-400 block">Cash Required</span>
                            <span className="font-mono font-semibold text-neutral-100 text-sm">
                              {formatCurrency(cashRequired)}
                            </span>
                          </div>
                          <div className="rounded-none border border-neutral-800 bg-neutral-900/30 p-2.5">
                            <span className="text-[10px] uppercase font-mono text-neutral-400 block">Target IRR</span>
                            <span className="font-mono font-semibold text-neutral-100 text-sm">
                              {formatPercent(targetIrr / 100)}
                            </span>
                          </div>
                          <div className="rounded-none border border-neutral-800 bg-neutral-900/30 p-2.5">
                            <span className="text-[10px] uppercase font-mono text-neutral-400 block">Equity Multiple</span>
                            <span className="font-mono font-semibold text-neutral-100 text-sm">
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
