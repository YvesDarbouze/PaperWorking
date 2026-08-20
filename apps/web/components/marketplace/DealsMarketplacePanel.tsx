'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import DealCard, { type DealCardData } from '@/components/marketplace/DealCard';
import DashboardPageHeader, {
  DashboardPrimaryButton,
  DashboardSecondaryButton,
} from '@/components/dashboard/DashboardPageHeader';

type DealsTab = 'discover' | 'my_activity';
type ViewMode = 'grid' | 'map';

interface DealsPayload {
  success?: boolean;
  total?: number;
  deals?: DealCardData[];
}

export default function DealsMarketplacePanel() {
  const [tab, setTab] = useState<DealsTab>('discover');
  const [view, setView] = useState<ViewMode>('grid');
  const [query, setQuery] = useState('');
  const [assetFilter, setAssetFilter] = useState('all');
  const [payload, setPayload] = useState<DealsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/deals?tab=${tab}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const body = (await response.json()) as DealsPayload & { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Failed to load deals');
      setPayload(body);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load deals');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  const assetTypes = useMemo(() => {
    const set = new Set((payload?.deals ?? []).map((deal) => deal.assetClass));
    return ['all', ...Array.from(set)];
  }, [payload]);

  const deals = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (payload?.deals ?? []).filter((deal) => {
      if (assetFilter !== 'all' && deal.assetClass !== assetFilter) return false;
      if (!q) return true;
      return (
        deal.propertyName.toLowerCase().includes(q) ||
        deal.address.toLowerCase().includes(q) ||
        deal.city.toLowerCase().includes(q)
      );
    });
  }, [payload, query, assetFilter]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-5 py-6 lg:px-8 lg:py-7">
      <DashboardPageHeader
        title="Deals Marketplace"
        subtitle="Discover vetted opportunities and syndicate deals across your network."
        actions={
          <>
            <DashboardSecondaryButton href="/dashboard/deals" icon="compare_arrows">
              Compare
            </DashboardSecondaryButton>
            <DashboardPrimaryButton href="/dashboard/deals?action=create" icon="add">
              List a Deal
            </DashboardPrimaryButton>
          </>
        }
      />

      <div className="rounded-2xl border border-white/10 bg-[#121014]/90 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
            <span className="material-symbols-outlined text-[18px] text-white/40">search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search any street address or deal name…"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
            />
          </div>
          <div className="flex rounded-lg border border-white/10 p-0.5">
            {(['grid', 'map'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={`rounded-md px-3 py-1.5 text-[12px] font-semibold capitalize ${
                  view === mode ? 'bg-white/15 text-white' : 'text-white/55'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {([
            { id: 'discover' as const, label: 'Discover' },
            { id: 'my_activity' as const, label: 'My Activity' },
          ]).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTab(option.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                tab === option.id
                  ? 'bg-emerald-500 text-slate-950'
                  : 'border border-white/15 text-white/70 hover:bg-white/5'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {assetTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setAssetFilter(type)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide ${
                assetFilter === type
                  ? 'bg-white text-black'
                  : 'border border-white/12 text-white/55'
              }`}
            >
              {type === 'all' ? 'All assets' : type}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-[#121014]/90 p-8 text-sm text-white/60">
          Loading deals…
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-6 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {!loading && !error && view === 'map' ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#121014]/90 p-10 text-center">
          <span className="material-symbols-outlined text-4xl text-white/25">map</span>
          <p className="text-sm font-medium text-white/70">Map view preview</p>
          <p className="max-w-md text-xs text-white/45">
            Deal map tiles connect when marketplace geo adapters are wired. Switch to Grid to browse seed
            deals.
          </p>
          <button
            type="button"
            onClick={() => setView('grid')}
            className="mt-2 text-xs font-semibold text-emerald-400"
          >
            Back to grid
          </button>
        </div>
      ) : null}

      {!loading && !error && view === 'grid' ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </section>
      ) : null}

      {!loading && !error && view === 'grid' && deals.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#121014]/90 p-10 text-center">
          <p className="text-sm text-white/60">No deals match this tab or filter.</p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setAssetFilter('all');
            }}
            className="mt-3 text-xs font-semibold text-[#7A9EAA]"
          >
            Reset filters
          </button>
        </div>
      ) : null}

      <p className="text-[11px] text-white/35">
        Marketplace listings are informational. Perform your own diligence before committing capital.{' '}
        <Link href="/support" className="text-[#7A9EAA] no-underline hover:underline">
          Learn more
        </Link>
      </p>
    </div>
  );
}
