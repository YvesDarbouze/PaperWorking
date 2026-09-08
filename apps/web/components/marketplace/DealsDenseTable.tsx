'use client';

import React from 'react';
import Link from 'next/link';
import type { DealCardData } from './DealCard';
import { Button } from '@/components/ui/Button';
import {
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
}

export default function DealsDenseTable({
  deals,
  className = '',
}: DealsDenseTableProps) {
  return (
    <div
      data-testid="deals-dense-table"
      className={`w-full overflow-x-auto rounded-2xl border border-white/10 bg-[#121014] shadow-xl ${className}`}
    >
      <table className="w-full text-left text-xs border-collapse">
        <thead className="sticky top-0 z-20 border-b border-white/10 bg-[#161318] text-[10px] font-bold uppercase tracking-wider text-[#9E9DA0]">
          <tr>
            <th className="py-3.5 pl-4 pr-2 font-bold">Deal / Asset</th>
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

            return (
              <tr
                key={deal.id}
                data-testid={`dense-row-${deal.slug || deal.id}`}
                className="group transition-colors hover:bg-white/[0.04]"
              >
                {/* Deal Title & Operator */}
                <td className="py-3 pl-4 pr-2">
                  <Link
                    href={detailUrl}
                    className="font-bold text-[#fdfffc] group-hover:text-[var(--accent)] transition-colors no-underline block"
                  >
                    {name}
                  </Link>
                  <span className="text-[11px] text-[#9E9DA0] block truncate max-w-[220px]">
                    {deal.creatorName || 'Verified Operator'}
                  </span>
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

                {/* Action CTA */}
                <td className="py-3 pl-2 pr-4 text-right whitespace-nowrap">
                  <Button
                    href={detailUrl}
                    variant="secondary"
                    size="sm"
                    className="!px-3 !py-1 text-xs"
                  >
                    View →
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
