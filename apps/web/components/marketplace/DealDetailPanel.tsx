'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  calculateFundingProgress,
  formatDealCurrency,
} from '@/lib/marketplace/seed-data';

interface DealPreview {
  id: string;
  slug: string;
  name: string;
  address: string;
  price: number;
  roi: number;
  status: string;
  visibility?: string;
  creatorName: string;
  committed: number;
  target: number;
  assetClass?: string;
  subStrategy?: string;
}

export default function DealDetailPanel({ slug }: { slug: string }) {
  const [deal, setDeal] = useState<DealPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/deals/exists?slug=${encodeURIComponent(slug)}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const body = (await response.json()) as {
          exists: boolean;
          deal: DealPreview | null;
          error?: string;
        };
        if (!response.ok) throw new Error(body.error ?? 'Failed to load deal');
        if (!body.exists || !body.deal) throw new Error('Deal not found or not visible');
        if (!cancelled) setDeal(body.deal);
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

  return (
    <div className="w-full min-w-0 space-y-8 px-4 py-8 md:px-8">
      <Link href="/dashboard/deals" className="text-sm text-white/60 underline-offset-4 hover:underline">
        ← Back to marketplace
      </Link>

      <section>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
          Deal detail
        </p>
        <h1 className="text-3xl font-semibold tracking-[-0.02em]">{deal.name}</h1>
        <p className="mt-2 text-sm text-white/65">{deal.address}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs capitalize">{deal.status}</span>
          {deal.assetClass ? (
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs">{deal.assetClass}</span>
          ) : null}
          {deal.subStrategy ? (
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs">{deal.subStrategy}</span>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Purchase price', value: formatDealCurrency(deal.price) },
          { label: 'Funding target', value: formatDealCurrency(deal.target) },
          { label: 'Committed', value: formatDealCurrency(deal.committed) },
          { label: 'Projected ROI', value: `${deal.roi.toFixed(1)}%` },
        ].map((item) => (
          <article key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-white/45">{item.label}</p>
            <p className="mt-2 text-xl font-semibold">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <div className="mb-2 flex justify-between text-sm">
          <span>{progress}% funded</span>
          <span className="text-white/55">Sponsor: {deal.creatorName}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-white/70" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-4 text-sm text-white/65">
          Resolved via `handleDealsExistsGet` with visibility rules for marketplace and invitation-only deals.
        </p>
      </section>
    </div>
  );
}
