'use client';

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { useCompare } from '@/context/CompareContext';
import { Button } from '@/components/ui/Button';
import {
  formatCurrencyCompact,
  formatPercent,
  formatMultiple,
  formatHoldPeriod,
} from '@/lib/format';
import { setupFocusTrap } from '@/lib/a11y/focus-trap';

export default function CompareTray() {
  const {
    comparedDeals,
    removeFromCompare,
    clearCompare,
    isCompareModalOpen,
    openCompareModal,
    closeCompareModal,
  } = useCompare();

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isCompareModalOpen) return;
    const cleanup = setupFocusTrap({
      container: modalRef.current,
      isActive: isCompareModalOpen,
      onClose: closeCompareModal,
    });
    return cleanup;
  }, [isCompareModalOpen, closeCompareModal]);

  if (comparedDeals.length === 0) return null;

  // Determine best metrics across the compared deals
  const bestTargetIrr = Math.max(
    ...comparedDeals.map((d) => d.targetIrr ?? d.projectedRoi ?? 0),
  );
  const bestEquityMultiple = Math.max(
    ...comparedDeals.map((d) => d.equityMultiple ?? 0),
  );
  const bestMinInvestment = Math.min(
    ...comparedDeals.map((d) => d.minInvestment ?? Infinity),
  );
  const bestCapRate = Math.max(
    ...comparedDeals.map((d) => (d as any).capRate ?? 0),
  );

  return (
    <>
      {/* 1. Floating Bottom Tray */}
      <aside
        data-testid="compare-tray"
        aria-label="Deals comparison tray"
        className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-white/15 bg-[#161318]/95 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-200"
      >
        <div className="flex items-center gap-2 pr-2 border-r border-white/10 text-xs font-bold text-[#fdfffc]">
          <span className="material-symbols-outlined text-[18px] text-[var(--accent)]">compare_arrows</span>
          <span>Compare ({comparedDeals.length}/3)</span>
        </div>

        {/* Selected deal chips */}
        <div className="flex items-center gap-2">
          {comparedDeals.map((deal) => (
            <div
              key={deal.id}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-[#fdfffc]"
            >
              <span className="max-w-[110px] truncate font-medium">
                {deal.propertyName || deal.name || deal.address}
              </span>
              <button
                type="button"
                onClick={() => removeFromCompare(deal.id)}
                className="text-[#9E9DA0] hover:text-white transition"
                aria-label={`Remove ${deal.propertyName || deal.name} from compare`}
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pl-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={openCompareModal}
            data-testid="open-compare-modal-btn"
          >
            Compare Deals
          </Button>
          <button
            type="button"
            onClick={clearCompare}
            className="text-xs font-semibold text-[#9E9DA0] hover:text-[var(--accent)] transition"
          >
            Clear
          </button>
        </div>
      </aside>

      {/* 2. Side-By-Side Comparison Modal */}
      {isCompareModalOpen && (
        <div
          data-testid="compare-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="compare-modal-title"
            className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-white/15 bg-[#121014] shadow-2xl overflow-hidden dropdown-entrance"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-[#161318]">
              <div>
                <h2 id="compare-modal-title" className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[var(--accent)]">
                    compare_arrows
                  </span>
                  Side-by-Side Deal Comparison
                </h2>
                <p className="text-xs text-[#9E9DA0] mt-0.5">
                  Best-in-category metrics highlighted in green for institutional screening.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCompareModal}
                className="rounded-lg p-1 text-[#9E9DA0] hover:bg-white/10 hover:text-white"
                aria-label="Close compare modal"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body: Comparison Grid Table */}
            <div className="flex-1 overflow-auto p-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="w-1/4 pb-4 font-bold uppercase tracking-wider text-[#9E9DA0] text-[10px]">
                      Metric / Attribute
                    </th>
                    {comparedDeals.map((d) => (
                      <th key={d.id} className="pb-4 px-3 align-top">
                        <h4 className="text-sm font-bold text-white line-clamp-1">
                          {d.propertyName || d.name || 'Deal'}
                        </h4>
                        <p className="text-[11px] text-[#9E9DA0] truncate">{d.city}, {d.state}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {/* Target IRR */}
                  <tr>
                    <td className="py-3 font-semibold text-[#9E9DA0]">Target IRR</td>
                    {comparedDeals.map((d) => {
                      const irr = d.targetIrr ?? d.projectedRoi ?? 0;
                      const isBest = irr === bestTargetIrr && irr > 0;
                      return (
                        <td key={d.id} className="py-3 px-3">
                          <span
                            data-testid={`compare-irr-${d.id}`}
                            className={`font-mono font-bold text-sm ${
                              isBest
                                ? 'rounded border border-[var(--accent)]/40 bg-[var(--accent-subtle)] px-2 py-0.5 text-[var(--accent)]'
                                : 'text-white'
                            }`}
                          >
                            {formatPercent(irr)}
                            {isBest && ' ★'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Equity Multiple */}
                  <tr>
                    <td className="py-3 font-semibold text-[#9E9DA0]">Equity Multiple</td>
                    {comparedDeals.map((d) => {
                      const em = d.equityMultiple ?? 1.75;
                      const isBest = em === bestEquityMultiple && em > 0;
                      return (
                        <td key={d.id} className="py-3 px-3">
                          <span
                            data-testid={`compare-em-${d.id}`}
                            className={`font-mono font-bold text-sm ${
                              isBest
                                ? 'rounded border border-[var(--accent)]/40 bg-[var(--accent-subtle)] px-2 py-0.5 text-[var(--accent)]'
                                : 'text-white'
                            }`}
                          >
                            {formatMultiple(em)}
                            {isBest && ' ★'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Min Investment */}
                  <tr>
                    <td className="py-3 font-semibold text-[#9E9DA0]">Min Investment</td>
                    {comparedDeals.map((d) => {
                      const minCheck = d.minInvestment ?? 25000;
                      const isBest = minCheck === bestMinInvestment && minCheck > 0;
                      return (
                        <td key={d.id} className="py-3 px-3">
                          <span
                            data-testid={`compare-min-${d.id}`}
                            className={`font-mono font-bold text-sm ${
                              isBest
                                ? 'rounded border border-[var(--accent)]/40 bg-[var(--accent-subtle)] px-2 py-0.5 text-[var(--accent)]'
                                : 'text-white'
                            }`}
                          >
                            {formatCurrencyCompact(minCheck)}
                            {isBest && ' ★'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Hold Period */}
                  <tr>
                    <td className="py-3 font-semibold text-[#9E9DA0]">Hold Period</td>
                    {comparedDeals.map((d) => (
                      <td key={d.id} className="py-3 px-3 font-mono text-white">
                        {formatHoldPeriod(d.holdPeriod || '3–5 Years')}
                      </td>
                    ))}
                  </tr>

                  {/* Cap Rate */}
                  <tr>
                    <td className="py-3 font-semibold text-[#9E9DA0]">Cap Rate</td>
                    {comparedDeals.map((d) => {
                      const cr = (d as any).capRate ?? 6.2;
                      const isBest = cr === bestCapRate && cr > 0;
                      return (
                        <td key={d.id} className="py-3 px-3">
                          <span
                            className={`font-mono font-bold text-sm ${
                              isBest
                                ? 'rounded border border-[var(--accent)]/40 bg-[var(--accent-subtle)] px-2 py-0.5 text-[var(--accent)]'
                                : 'text-white'
                            }`}
                          >
                            {formatPercent(cr)}
                            {isBest && ' ★'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Asset Class */}
                  <tr>
                    <td className="py-3 font-semibold text-[#9E9DA0]">Asset Class</td>
                    {comparedDeals.map((d) => (
                      <td key={d.id} className="py-3 px-3 text-white">
                        <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold">
                          {d.assetClass || 'Commercial'}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Operator Provenance */}
                  <tr>
                    <td className="py-3 font-semibold text-[#9E9DA0]">Operator</td>
                    {comparedDeals.map((d) => (
                      <td key={d.id} className="py-3 px-3 text-white">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold truncate max-w-[140px]">
                            {d.creatorName || 'Apex Capital'}
                          </span>
                          {d.isVerifiedOperator !== false && (
                            <span className="material-symbols-outlined text-[14px] text-[var(--accent)]">
                              verified
                            </span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Detail Action */}
                  <tr>
                    <td className="py-4 font-semibold text-[#9E9DA0]">Actions</td>
                    {comparedDeals.map((d) => (
                      <td key={d.id} className="py-4 px-3">
                        <Button
                          href={`/marketplace/${d.slug || d.id}`}
                          variant="secondary"
                          size="sm"
                          onClick={closeCompareModal}
                          className="w-full justify-center"
                        >
                          View Detail →
                        </Button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 border-t border-white/10 px-6 py-3 bg-[#161318]">
              <Button variant="secondary" size="sm" onClick={closeCompareModal}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
