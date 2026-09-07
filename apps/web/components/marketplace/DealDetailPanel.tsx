'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  calculateFundingProgress,
  formatDealCurrency,
} from '@/lib/marketplace/format';
import DealBroadcastModal from '@/components/marketplace/DealBroadcastModal';
import { getDealBySlugFromBff } from '@/lib/deals/deal-api';

interface DealPreview {
  id: string;
  slug: string;
  name: string;
  address: string;
  price: number;
  roi: number | null;
  status: string;
  visibility?: string;
  creatorName: string;
  committed: number;
  target: number;
  assetClass?: string;
  subStrategy?: string;
  projectId?: string | null;
  projectName?: string | null;
}

function asFiniteNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapExistsDealToPreview(raw: Record<string, unknown>): DealPreview {
  const purchase = asFiniteNumber(raw.purchasePrice ?? raw.price) ?? 0;
  const rehab = asFiniteNumber(raw.rehabCost) ?? 0;
  return {
    id: String(raw.id ?? ''),
    slug: String(raw.slug ?? ''),
    name: String(raw.propertyName || raw.name || raw.address || 'Deal'),
    address: String(raw.address ?? ''),
    price: purchase,
    roi: asFiniteNumber(raw.projectedRoi ?? raw.roi),
    status: String(raw.status ?? 'draft'),
    visibility: raw.visibility != null ? String(raw.visibility) : undefined,
    creatorName: String(raw.creatorName || raw.creatorId || '—'),
    committed: asFiniteNumber(raw.committedAmount ?? raw.committed) ?? 0,
    target: asFiniteNumber(raw.fundingTarget ?? raw.target) ?? purchase + rehab,
    assetClass: raw.assetClass != null ? String(raw.assetClass) : undefined,
    subStrategy: raw.subStrategy != null ? String(raw.subStrategy) : undefined,
    projectId: raw.projectId != null && raw.projectId !== '' ? String(raw.projectId) : null,
    projectName: raw.projectName != null ? String(raw.projectName) : null,
  };
}

export default function DealDetailPanel({ slug }: { slug: string }) {
  const [deal, setDeal] = useState<DealPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const record = await getDealBySlugFromBff(slug);
        if (!record) throw new Error('Deal not found or not visible');
        if (!cancelled) setDeal(mapExistsDealToPreview(record as Record<string, unknown>));
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load deal');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-sm text-white/65">
        Loading deal…
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-red-400/20 bg-red-950/20 p-6 text-sm text-red-100">
          {error ?? 'Deal unavailable'}
        </div>
        <Link href="/dashboard/deals" className="text-sm text-white/70 underline-offset-4 hover:underline">
          Back to deals marketplace
        </Link>
      </div>
    );
  }

  const progress = calculateFundingProgress(deal.committed, deal.target);
  const visibilityLabel = deal.visibility ? deal.visibility.replace('_', ' ') : 'marketplace';
  const visibilityColor =
    deal.visibility === 'private'
      ? 'border-slate-500/30 bg-slate-500/10 text-slate-300'
      : deal.visibility === 'invitation_only'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';

  return (
    <div className="mx-auto max-w-[960px] space-y-8 px-4 py-8 md:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link href="/dashboard/deals" className="text-sm text-white/60 underline-offset-4 hover:underline">
          ← Back to marketplace
        </Link>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setBroadcastOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/5"
          >
            <span className="material-symbols-outlined text-[16px]">share</span>
            Share Analysis
          </button>

          <Link
            href={
              deal.projectId
                ? `/project/${deal.projectId}`
                : `/dashboard?linkDeal=${encodeURIComponent(deal.slug)}`
            }
            className="inline-flex items-center gap-1.5 rounded-full bg-[#00DD94] px-3 py-1.5 text-xs font-semibold text-[#0a0a0f] transition hover:brightness-110"
          >
            <span className="material-symbols-outlined text-[16px]">folder_open</span>
            Open Project Workspace
          </Link>
        </div>
      </div>

      <section>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
          Deal detail
        </p>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-white">{deal.name}</h1>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${visibilityColor}`}
          >
            {visibilityLabel}
          </span>
        </div>
        <p className="mt-2 text-sm text-white/65">{deal.address}</p>
        {deal.projectId && (
          <div className="mt-2.5">
            <Link
              href={`/project/${deal.projectId}`}
              className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#00DD94]/20 bg-[#00DD94]/10 px-3 py-1 text-sm font-medium text-[#00DD94] transition hover:bg-[#00DD94]/20"
            >
              <span className="material-symbols-outlined text-[16px]">folder_open</span>
              Linked to Project: {deal.projectName || deal.name}
            </Link>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs capitalize text-white/70">
            {deal.status}
          </span>
          {deal.assetClass ? (
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">
              {deal.assetClass}
            </span>
          ) : null}
          {deal.subStrategy ? (
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">
              {deal.subStrategy}
            </span>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Purchase price', value: formatDealCurrency(deal.price) },
          { label: 'Funding target', value: formatDealCurrency(deal.target) },
          { label: 'Committed', value: formatDealCurrency(deal.committed) },
          {
            label: 'Projected ROI',
            value: deal.roi == null ? 'N/A' : `${deal.roi.toFixed(1)}%`,
          },
        ].map((item) => (
          <article key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-white/45">{item.label}</p>
            <p className="mt-2 text-xl font-semibold text-white">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <div className="mb-2 flex justify-between text-sm text-white">
          <span>{progress}% funded</span>
          <span className="text-white/55">Lead Investor: {deal.creatorName}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#00DD94]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-4 text-sm text-white/65">
          Deal numbers come from the stored underwriting baseline. Visibility follows marketplace, invitation-only, and private rules.
        </p>
      </section>

      <DealBroadcastModal
        dealId={deal.id}
        dealName={deal.name}
        dealAddress={deal.address}
        dealRoi={deal.roi ?? 0}
        isOpen={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
      />
    </div>
  );
}
