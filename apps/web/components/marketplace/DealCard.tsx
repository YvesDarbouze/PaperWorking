'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  calculateFundingProgress,
  formatDealCurrency,
} from '@/lib/marketplace/format';
import DealBroadcastModal from '@/components/marketplace/DealBroadcastModal';

export interface DealCardData {
  id: string;
  slug: string;
  propertyName?: string;
  name?: string;
  address: string;
  city?: string;
  state?: string;
  assetClass?: string;
  subStrategy?: string;
  status: string;
  visibility?: 'marketplace' | 'invitation_only' | 'private' | string;
  projectedRoi?: number;
  roi?: number;
  fundingTarget?: number;
  target?: number;
  purchasePrice?: number;
  price?: number;
  committedAmount?: number;
  committed?: number;
  investorCount?: number;
  creatorName?: string;
  projectId?: string | null;
  projectName?: string | null;
}

export default function DealCard({
  deal,
  compact = false,
}: {
  deal: DealCardData;
  compact?: boolean;
}) {
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  const name = deal.propertyName || deal.name || deal.address || 'Deal Opportunity';
  const target = deal.fundingTarget ?? deal.target ?? 0;
  const committed = deal.committedAmount ?? deal.committed ?? 0;
  const roi = deal.projectedRoi ?? deal.roi ?? 0;
  const progress = calculateFundingProgress(committed, target);

  const visibilityLabel = deal.visibility
    ? deal.visibility.replace('_', ' ')
    : 'marketplace';

  const visibilityColor =
    deal.visibility === 'private'
      ? 'border-slate-500/30 bg-slate-500/10 text-slate-300'
      : deal.visibility === 'invitation_only'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';

  const locationText =
    deal.address ||
    (deal.city && deal.state ? `${deal.city}, ${deal.state}` : deal.city || '');

  if (compact) {
    return (
      <article className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              {deal.assetClass ? (
                <p className="text-[10px] uppercase tracking-[0.07em] text-white/45">
                  {deal.assetClass} {deal.subStrategy ? `· ${deal.subStrategy}` : ''}
                </p>
              ) : null}
              <span
                className={`rounded-full border px-2 py-0.2 text-[9px] font-medium capitalize ${visibilityColor}`}
              >
                {visibilityLabel}
              </span>
            </div>
            <h4 className="mt-1 text-base font-semibold text-white">{name}</h4>
            <p className="text-xs text-white/60">{locationText}</p>
          </div>
          <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] capitalize text-white/70">
            {deal.status}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-white/45">Purchase Price</p>
            <p className="font-medium text-white">{formatDealCurrency(deal.purchasePrice ?? deal.price ?? target)}</p>
          </div>
          <div>
            <p className="text-white/45">Projected ROI</p>
            <p className="font-medium text-white">{roi.toFixed(1)}%</p>
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[11px] text-white/50">
            <span>{progress}% funded</span>
            {deal.investorCount !== undefined ? (
              <span>{deal.investorCount} investors</span>
            ) : null}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#00DD94]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </article>
    );
  }

  return (
    <>
      <article className="flex flex-col justify-between rounded-2xl border border-white/8 bg-white/[0.03] p-5 transition hover:border-white/15">
        <div>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] uppercase tracking-[0.07em] text-white/45">
                  {deal.assetClass || 'Property'} {deal.subStrategy ? `· ${deal.subStrategy}` : ''}
                </p>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${visibilityColor}`}
                >
                  {visibilityLabel}
                </span>
              </div>
              <h3 className="mt-1 text-lg font-semibold text-white">{name}</h3>
              <p className="mt-1 text-sm text-white/60">{locationText}</p>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs capitalize text-white/70">
              {deal.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-white/45">Target</p>
              <p className="font-medium text-white">{formatDealCurrency(target)}</p>
            </div>
            <div>
              <p className="text-white/45">Projected ROI</p>
              <p className="font-medium text-white">{roi.toFixed(1)}%</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-white/55">
              <span>{progress}% funded</span>
              <span>{deal.investorCount ?? 0} investors</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#00DD94]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2 border-t border-white/5 pt-3">
          <Link
            href={`/deals/${deal.slug}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold text-white/85 transition hover:bg-white/5 hover:text-white"
          >
            View deal
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>

          <button
            type="button"
            onClick={() => setBroadcastOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-white/60 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">share</span>
            Share analysis
          </button>
        </div>
      </article>

      <DealBroadcastModal
        dealId={deal.id}
        dealName={name}
        dealAddress={locationText}
        dealRoi={roi}
        isOpen={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
      />
    </>
  );
}
