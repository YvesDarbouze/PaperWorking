'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DealCard, { type DealCardData } from '@/components/marketplace/DealCard';
import AddressSearch from '@/components/deals/AddressSearch';
import DashboardPageHeader, {
  DashboardSecondaryButton,
} from '@/components/dashboard/DashboardPageHeader';
import { createDealFromBff, listDealsFromBff } from '@/lib/deals/deal-api';

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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Deal / Project Linker state
  const [newAddress, setNewAddress] = useState('');
  const [newVisibility, setNewVisibility] = useState<'marketplace' | 'invitation_only' | 'private'>('marketplace');
  const [newPrice, setNewPrice] = useState('485000');
  const [newRehab, setNewRehab] = useState('68000');
  const [createSuccess, setCreateSuccess] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const hasLoadedOnce = useRef(false);

  const loadDeals = useCallback(async (tabOverride?: DealsTab) => {
    const activeTab = tabOverride ?? tab;
    if (!hasLoadedOnce.current) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const body = await listDealsFromBff({ tab: activeTab });
      setPayload(body as unknown as DealsPayload);
      setAssetFilter((current) => {
        if (current === 'all') return current;
        const types = new Set((body.deals ?? []).map((deal) => deal.assetClass));
        return types.has(current) ? current : 'all';
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load deals');
    } finally {
      setLoading(false);
      setRefreshing(false);
      hasLoadedOnce.current = true;
    }
  }, [tab]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  const assetTypes = useMemo(() => {
    const set = new Set(
      (payload?.deals ?? [])
        .map((deal) => deal.assetClass)
        .filter((ac): ac is string => typeof ac === 'string' && ac.length > 0),
    );
    return ['all', ...Array.from(set)];
  }, [payload]);

  const deals = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (payload?.deals ?? []).filter((deal) => {
      if (assetFilter !== 'all' && deal.assetClass !== assetFilter) return false;
      if (!q) return true;
      return (
        (deal.propertyName || '').toLowerCase().includes(q) ||
        (deal.name || '').toLowerCase().includes(q) ||
        (deal.address || '').toLowerCase().includes(q) ||
        (deal.city || '').toLowerCase().includes(q)
      );
    });
  }, [payload, query, assetFilter]);

  function handleTabChange(next: DealsTab) {
    if (next === tab) return;
    setTab(next);
    setAssetFilter('all');
  }

  async function handleCreateDeal(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    const visibility = newVisibility;
    const nextTab: DealsTab = visibility === 'marketplace' ? 'discover' : 'my_activity';
    const status = visibility === 'marketplace' ? ('published' as const) : ('draft' as const);

    try {
      await createDealFromBff({
        address: newAddress.trim(),
        purchasePrice: Number(newPrice) || 0,
        rehabCost: Number(newRehab) || 0,
        visibility,
        status,
      });

      setTab(nextTab);
      setQuery('');
      setAssetFilter('all');
      setCreateSuccess(true);

      setTimeout(async () => {
        setCreateSuccess(false);
        setIsCreateModalOpen(false);
        setNewAddress('');
        setNewPrice('485000');
        setNewRehab('68000');
        setNewVisibility('marketplace');
        await loadDeals(nextTab);
      }, 1200);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create deal');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-5 py-6 lg:px-8 lg:py-7">
      <DashboardPageHeader
        title="Deals Marketplace"
        subtitle="Discover vetted opportunities and syndicate deals across your network."
        actions={
          <>
            <DashboardSecondaryButton href="/dashboard" icon="folder">
              My Projects
            </DashboardSecondaryButton>
            <button
              type="button"
              onClick={() => {
                setCreateError(null);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#00DD94] px-4 py-2 text-xs font-semibold text-[#0a0a0f] transition hover:brightness-110"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              List a Deal
            </button>
          </>
        }
      />

      {/* Centralized AddressSearch with collision detection & view toggle */}
      <div className="rounded-2xl border border-white/10 bg-[#121014]/90 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1">
            <AddressSearch
              placeholder="Search any street address or deal name…"
              onSearchChange={(val) => setQuery(val ?? '')}
            />
          </div>
          <div className="flex shrink-0 rounded-lg border border-white/10 p-0.5">
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

      {/* Tabs and filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Deals tabs">
          {([
            { id: 'discover' as const, label: 'Discover' },
            { id: 'my_activity' as const, label: 'My Activity' },
          ]).map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={tab === option.id}
              onClick={() => handleTabChange(option.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                tab === option.id
                  ? 'bg-[#00DD94] text-slate-950'
                  : 'border border-white/15 text-white/70 hover:bg-white/5'
              }`}
            >
              {option.label}
            </button>
          ))}
          {refreshing ? (
            <span className="ml-1 inline-flex items-center gap-1.5 self-center text-[11px] text-white/40">
              <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
              Updating…
            </span>
          ) : null}
        </div>

        <div className="flex min-h-[34px] flex-wrap gap-2" aria-label="Asset filters">
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

      {/* Main Grid content */}
      <div className="relative min-h-[320px]">
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
              Deal map tiles connect when marketplace geo adapters are wired. Switch to Grid to browse
              deals.
            </p>
            <button
              type="button"
              onClick={() => setView('grid')}
              className="mt-2 text-xs font-semibold text-[#00DD94]"
            >
              Back to grid
            </button>
          </div>
        ) : null}

        {!loading && !error && view === 'grid' ? (
          <div
            className={`transition-opacity duration-150 ${refreshing ? 'pointer-events-none opacity-50' : 'opacity-100'}`}
          >
            {deals.length > 0 ? (
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {deals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </section>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-[#121014]/90 p-10 text-center">
                <p className="text-sm text-white/60">No deals match this tab or filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setAssetFilter('all');
                  }}
                  className="mt-3 text-xs font-semibold text-[#00DD94]"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* List / Link Deal Modal */}
      {isCreateModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#16141a] p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute right-4 top-4 text-white/50 hover:text-white"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            <h2 className="text-lg font-semibold text-white">List Deal / Link Active Project</h2>
            <p className="mt-1 text-xs text-white/60">
              Syndicate an underwriting pipeline project or publish a new deal opportunity.
            </p>

            {createSuccess ? (
              <div className="mt-6 rounded-xl border border-[#00DD94]/30 bg-[#00DD94]/10 p-5 text-center">
                <span className="material-symbols-outlined text-3xl text-[#00DD94]">check_circle</span>
                <p className="mt-2 text-sm font-semibold text-white">
                  Deal successfully saved and linked!
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreateDeal} className="mt-5 space-y-4">
                {createError ? (
                  <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-100">
                    {createError}
                  </div>
                ) : null}
                <div>
                  <label className="block text-xs font-medium text-white/70">
                    Property Address / Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="e.g. 789 Cedar Ct, Austin TX"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-[#00DD94] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-white/70">
                      Purchase Price ($)
                    </label>
                    <input
                      type="number"
                      required
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:border-[#00DD94] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/70">
                      Rehab Estimate ($)
                    </label>
                    <input
                      type="number"
                      required
                      value={newRehab}
                      onChange={(e) => setNewRehab(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:border-[#00DD94] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70">
                    Deal Visibility
                  </label>
                  <select
                    value={newVisibility}
                    onChange={(e) =>
                      setNewVisibility(
                        e.target.value as 'marketplace' | 'invitation_only' | 'private',
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-[#16141a] px-3 py-2 text-xs text-white focus:border-[#00DD94] focus:outline-none"
                  >
                    <option value="marketplace">Marketplace (Public to verified network)</option>
                    <option value="invitation_only">Invitation Only (Shared via links/email)</option>
                    <option value="private">Private (Workspace &amp; Team only)</option>
                  </select>
                </div>

                <div className="mt-6 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="rounded-xl bg-[#00DD94] px-5 py-2 text-xs font-semibold text-[#0a0a0f] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creating ? 'Publishing…' : 'Publish Deal'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}

      <p className="text-[11px] text-white/35">
        Marketplace listings are informational. Perform your own diligence before committing capital.{' '}
        <Link href="/support" className="text-[#00DD94] no-underline hover:underline">
          Learn more
        </Link>
      </p>
    </div>
  );
}
