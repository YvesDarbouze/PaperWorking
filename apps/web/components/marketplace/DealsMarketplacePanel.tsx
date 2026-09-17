'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import DealCard, { type DealCardData } from '@/components/marketplace/DealCard';
import DealsSearchHero from '@/components/marketplace/DealsSearchHero';
import MarketplaceFilterRail, {
  type MarketplaceFilterState,
} from '@/components/marketplace/MarketplaceFilterRail';
import MarketplaceActiveFilters from '@/components/marketplace/MarketplaceActiveFilters';
import DealsDenseTable from '@/components/marketplace/DealsDenseTable';
import { Button } from '@/components/ui/Button';
import { bffFetch } from '@/lib/api/bff-fetch';
import { useOptionalAuth } from '@/context/AuthContext';
import DealBroadcastModal from '@/components/marketplace/DealBroadcastModal';
import CompareTray from '@/components/marketplace/CompareTray';
import { useRovingTabindex } from '@/lib/a11y/useRovingTabindex';

type SortOption = 'recommended' | 'newest' | 'highest_irr' | 'lowest_min' | 'closing_soon';
type DensityMode = 'grid' | 'table';

interface DealsApiResponse {
  success?: boolean;
  total?: number;
  deals?: DealCardData[];
  error?: string;
}

const DEFAULT_FILTERS: MarketplaceFilterState = {
  dealType: 'all',
  assetClasses: [],
  markets: [],
  minInvestmentMax: 100000,
  minIrr: 5,
  holdPeriods: [],
  statuses: [],
};

const ITEMS_PER_PAGE = 12;

/**
 * Deterministic scoring algorithm for "Recommended" sort order:
 * Combines funding momentum (40%), target IRR yield (30%), and listing recency (30%).
 */
export function calculateRecommendedScore(deal: DealCardData): number {
  const target = deal.fundingTarget ?? deal.target ?? 1_000_000;
  const committed = deal.committedAmount ?? deal.committed ?? 0;
  const fundingRatio = target > 0 ? Math.min(1, committed / target) : 0;
  const fundingScore = fundingRatio * 40; // 0 to 40

  const irr = deal.targetIrr ?? deal.projectedRoi ?? deal.roi ?? 15;
  const normalizedIrr = Math.min(25, Math.max(5, irr));
  const irrScore = ((normalizedIrr - 5) / 20) * 30; // 0 to 30

  // Recency score (newer listings score higher)
  let recencyScore = 15;
  if (deal.createdAt) {
    const ageMs = Math.max(0, Date.now() - new Date(deal.createdAt).getTime());
    const daysOld = ageMs / (1000 * 60 * 60 * 24);
    recencyScore = Math.max(0, 30 - Math.min(30, daysOld * 0.5));
  }

  return fundingScore + irrScore + recencyScore;
}

export default function DealsMarketplacePanel() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Local & remote state
  const [allDeals, setAllDeals] = useState<DealCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Initialize filters from URL parameters
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') ?? '');
  const [sortOption, setSortOption] = useState<SortOption>(
    () => (searchParams.get('sort') as SortOption) || 'recommended',
  );
  const [density, setDensity] = useState<DensityMode>(
    () => (searchParams.get('density') as DensityMode) || 'grid',
  );

  const [filters, setFilters] = useState<MarketplaceFilterState>(() => {
    const dealType = (searchParams.get('dealType') as MarketplaceFilterState['dealType']) || 'all';
    const assetClasses = searchParams.get('asset') ? searchParams.get('asset')!.split(',') : [];
    const markets = searchParams.get('market') ? searchParams.get('market')!.split(',') : [];
    const minIrr = searchParams.get('minIrr') ? parseFloat(searchParams.get('minIrr')!) : 5;
    const minInvestmentMax = searchParams.get('maxMinCheck')
      ? parseInt(searchParams.get('maxMinCheck')!, 10)
      : 100000;
    const holdPeriods = searchParams.get('holdPeriod')
      ? searchParams.get('holdPeriod')!.split(',')
      : [];
    const statuses = searchParams.get('status') ? searchParams.get('status')!.split(',') : [];

    return {
      dealType,
      assetClasses,
      markets,
      minInvestmentMax,
      minIrr,
      holdPeriods,
      statuses,
    };
  });

  const auth = useOptionalAuth();
  const isAuthed = auth ? auth.authenticated && !auth.loading : true;

  // Sync state to URL search parameters
  const updateUrlParams = useCallback(
    (
      newFilters: MarketplaceFilterState,
      newSearch: string,
      newSort: SortOption,
      newDensity: DensityMode,
    ) => {
      const params = new URLSearchParams();

      if (newSearch.trim()) params.set('search', newSearch.trim());
      if (newSort !== 'recommended') params.set('sort', newSort);
      if (newDensity !== 'grid') params.set('density', newDensity);
      if (newFilters.dealType !== 'all') params.set('dealType', newFilters.dealType);
      if (newFilters.assetClasses.length > 0) params.set('asset', newFilters.assetClasses.join(','));
      if (newFilters.markets.length > 0) params.set('market', newFilters.markets.join(','));
      if (newFilters.minIrr > 5) params.set('minIrr', String(newFilters.minIrr));
      if (newFilters.minInvestmentMax < 100000)
        params.set('maxMinCheck', String(newFilters.minInvestmentMax));
      if (newFilters.holdPeriods.length > 0)
        params.set('holdPeriod', newFilters.holdPeriods.join(','));
      if (newFilters.statuses.length > 0) params.set('status', newFilters.statuses.join(','));

      const queryString = params.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(targetUrl, { scroll: false });
    },
    [pathname, router],
  );

  // Fetch deals from API
  const loadDeals = useCallback(async () => {
    if (!isAuthed) return;
    setLoading(true);
    setError(null);
    try {
      const response = await bffFetch('/api/deals?tab=discover', { cache: 'no-store' });
      const body = (await response.json()) as DealsApiResponse;
      if (!response.ok) throw new Error(body.error ?? 'Failed to load deals');
      setAllDeals(body.deals ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deals');
    } finally {
      setLoading(false);
    }
  }, [isAuthed]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  // Handle Search Change
  const handleSearchChange = (queryVal: string) => {
    setSearchQuery(queryVal);
    setVisibleCount(ITEMS_PER_PAGE);
    updateUrlParams(filters, queryVal, sortOption, density);
  };

  // Handle Filter Change
  const handleFilterChange = (updated: MarketplaceFilterState) => {
    setFilters(updated);
    setVisibleCount(ITEMS_PER_PAGE);
    updateUrlParams(updated, searchQuery, sortOption, density);
  };

  // Handle Sort Change
  const handleSortChange = (newSort: SortOption) => {
    setSortOption(newSort);
    updateUrlParams(filters, searchQuery, newSort, density);
  };

  // Handle Density Change
  const handleDensityChange = (newDensity: DensityMode) => {
    setDensity(newDensity);
    updateUrlParams(filters, searchQuery, sortOption, newDensity);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery('');
    setSortOption('recommended');
    setVisibleCount(ITEMS_PER_PAGE);
    updateUrlParams(DEFAULT_FILTERS, '', 'recommended', density);
  };

  // Multi-facet filtering logic
  const filteredDeals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return allDeals.filter((deal) => {
      // 1. Text Search (title, address, city, state, operator)
      if (q) {
        const textToMatch = [
          deal.propertyName || '',
          deal.name || '',
          deal.address || '',
          deal.city || '',
          deal.state || '',
          deal.creatorName || '',
          deal.assetClass || '',
        ]
          .join(' ')
          .toLowerCase();

        if (!textToMatch.includes(q)) return false;
      }

      // 2. Deal Type
      if (filters.dealType !== 'all') {
        const dType = deal.dealType || 'syndication';
        if (dType !== filters.dealType) return false;
      }

      // 3. Asset Class
      if (filters.assetClasses.length > 0) {
        const normAc = (deal.assetClass || 'Multifamily').replace(/[-_\s]/g, '').toLowerCase();
        const matches = filters.assetClasses.some(
          (f) => f.replace(/[-_\s]/g, '').toLowerCase() === normAc,
        );
        if (!matches) return false;
      }

      // 4. Market
      if (filters.markets.length > 0) {
        const cityState = [deal.city, deal.state].filter(Boolean).join(', ');
        if (!filters.markets.includes(cityState)) return false;
      }

      // 5. Min IRR
      const irr = deal.targetIrr ?? deal.projectedRoi ?? deal.roi ?? 15;
      if (irr < filters.minIrr) return false;

      // 6. Max Min Investment Check
      const minCheck = deal.minInvestment ?? 25_000;
      if (filters.minInvestmentMax < 100000 && minCheck > filters.minInvestmentMax) return false;

      // 7. Hold Period
      if (filters.holdPeriods.length > 0) {
        const hp = deal.holdPeriod || '3–5 Years';
        const matchesHp = filters.holdPeriods.some((period) => {
          if (period === '<3') return hp.includes('<') || hp.includes('1') || hp.includes('2');
          if (period === '3–5') return hp.includes('3') || hp.includes('4') || hp.includes('5');
          if (period === '5–7') return hp.includes('5') || hp.includes('6') || hp.includes('7');
          if (period === '7+') return hp.includes('7+') || hp.includes('8') || hp.includes('10');
          return hp.includes(period);
        });
        if (!matchesHp) return false;
      }

      // 8. Status
      if (filters.statuses.length > 0) {
        const st = (deal.status || 'published').toLowerCase();
        if (!filters.statuses.includes(st)) return false;
      }

      return true;
    });
  }, [allDeals, searchQuery, filters]);

  // Sort logic
  const sortedDeals = useMemo(() => {
    const list = [...filteredDeals];

    switch (sortOption) {
      case 'recommended':
        return list.sort((a, b) => calculateRecommendedScore(b) - calculateRecommendedScore(a));
      case 'newest':
        return list.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
        );
      case 'highest_irr':
        return list.sort((a, b) => {
          const irrA = a.targetIrr ?? a.projectedRoi ?? a.roi ?? 0;
          const irrB = b.targetIrr ?? b.projectedRoi ?? b.roi ?? 0;
          return irrB - irrA;
        });
      case 'lowest_min':
        return list.sort((a, b) => (a.minInvestment ?? 25000) - (b.minInvestment ?? 25000));
      case 'closing_soon':
        return list.sort((a, b) => {
          const targetA = a.fundingTarget ?? a.target ?? 1;
          const committedA = a.committedAmount ?? a.committed ?? 0;
          const pctA = targetA > 0 ? committedA / targetA : 0;

          const targetB = b.fundingTarget ?? b.target ?? 1;
          const committedB = b.committedAmount ?? b.committed ?? 0;
          const pctB = targetB > 0 ? committedB / targetB : 0;

          return pctB - pctA;
        });
      default:
        return list;
    }
  }, [filteredDeals, sortOption]);

  // Sliced deals for infinite scroll
  const visibleDeals = useMemo(() => {
    return sortedDeals.slice(0, visibleCount);
  }, [sortedDeals, visibleCount]);

  // Arrow key grid navigation
  const { getTabIndex: getGridTabIndex, handleKeyDown: handleGridKeyDown } = useRovingTabindex({
    itemCount: visibleDeals.length,
    columns: 3,
  });

  // Unique markets count for live header
  const marketsCount = useMemo(() => {
    const set = new Set<string>();
    allDeals.forEach((d) => {
      const city = d.city || '';
      const state = d.state || '';
      if (city || state) set.add(`${city}, ${state}`);
    });
    return set.size || 12;
  }, [allDeals]);

  // Infinite scroll observer target
  const observerTargetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = observerTargetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && visibleCount < sortedDeals.length) {
          setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [visibleCount, sortedDeals.length]);

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Skip-To-Results Link for Keyboard Accessibility */}
      <a href="#marketplace-results" className="skip-link">
        Skip to deal results
      </a>

      {/* Screen reader live region for filter and loading announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {loading
          ? 'Scanning live market inventory'
          : error
            ? "We couldn't load deals for this filter — try removing one, or retry."
            : `Showing ${sortedDeals.length} deals matching your filters`}
      </div>

      {/* 1. Page Header with Live Status Dot */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#fdfffc] sm:text-3xl">
              Deals Marketplace
            </h1>
            <span className="flex items-center gap-1.5 rounded-full border border-[var(--status-live)]/30 bg-[var(--accent-subtle)] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[var(--status-live)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--status-live)] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--status-live)]" />
              </span>
              Live
            </span>
          </div>
          <p className="mt-1 text-sm text-[#9E9DA0]">
            {loading ? (
              'Scanning live market inventory…'
            ) : (
              <>
                <strong className="font-mono text-white">{sortedDeals.length}</strong> active
                opportunities across{' '}
                <strong className="font-mono text-white">{marketsCount}</strong> markets
              </>
            )}
          </p>
        </div>

        {/* Secondary Header CTA: Broadcast / List Deal */}
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsBroadcastOpen(true)}
            icon={<span className="material-symbols-outlined text-[16px]">campaign</span>}
          >
            Broadcast Deal
          </Button>
        </div>
      </header>

      {/* 2. Full-Width Search Hero (F-03 In-Place Autocomplete) */}
      <div className="w-full">
        <DealsSearchHero
          value={searchQuery}
          deals={allDeals}
          onSearchChange={handleSearchChange}
        />
      </div>

      {/* 3. Main Marketplace Layout: Left Filter Rail + Right Grid/Table */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Sticky Filter Rail (Desktop) */}
        <div className="hidden lg:block">
          <MarketplaceFilterRail
            filters={filters}
            allDeals={allDeals}
            onChange={handleFilterChange}
            onReset={handleResetFilters}
          />
        </div>

        {/* Mobile Filter Drawer Toggle */}
        <div className="flex lg:hidden w-full items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsMobileFilterOpen(true)}
            icon={<span className="material-symbols-outlined text-[16px]">tune</span>}
          >
            Filters ({filters.assetClasses.length + filters.markets.length + (filters.dealType !== 'all' ? 1 : 0)})
          </Button>

          {/* Density Toggle (Mobile) */}
          <div className="flex items-center rounded-lg border border-white/10 bg-[#121014] p-0.5">
            <button
              type="button"
              onClick={() => handleDensityChange('grid')}
              className={`p-1.5 rounded ${density === 'grid' ? 'bg-white/10 text-white' : 'text-[#9E9DA0]'}`}
              aria-label="Grid view"
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
            </button>
            <button
              type="button"
              onClick={() => handleDensityChange('table')}
              className={`p-1.5 rounded ${density === 'table' ? 'bg-white/10 text-white' : 'text-[#9E9DA0]'}`}
              aria-label="Table view"
            >
              <span className="material-symbols-outlined text-[18px]">table_rows</span>
            </button>
          </div>
        </div>

        {/* Mobile Filter Modal */}
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm lg:hidden">
            <div className="w-full max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[#121014] p-5">
              <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white">Filters</h3>
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="rounded-lg p-1 text-[#9E9DA0] hover:text-white"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <MarketplaceFilterRail
                filters={filters}
                allDeals={allDeals}
                onChange={handleFilterChange}
                onReset={handleResetFilters}
              />
              <div className="mt-4">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="w-full justify-center"
                >
                  Show {sortedDeals.length} Opportunities
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Right Content Area: Active Chips + Sort Bar + Results */}
        <main className="flex-1 w-full min-w-0 space-y-4">
          {/* Active Filter Chips & View Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-white/10 bg-[#121014] p-3.5 shadow-sm">
            <MarketplaceActiveFilters
              filters={filters}
              searchQuery={searchQuery}
              totalResults={sortedDeals.length}
              onRemoveSearch={() => handleSearchChange('')}
              onRemoveAssetClass={(ac) =>
                handleFilterChange({
                  ...filters,
                  assetClasses: filters.assetClasses.filter((item) => item !== ac),
                })
              }
              onRemoveMarket={(m) =>
                handleFilterChange({
                  ...filters,
                  markets: filters.markets.filter((item) => item !== m),
                })
              }
              onRemoveHoldPeriod={(hp) =>
                handleFilterChange({
                  ...filters,
                  holdPeriods: filters.holdPeriods.filter((item) => item !== hp),
                })
              }
              onRemoveStatus={(st) =>
                handleFilterChange({
                  ...filters,
                  statuses: filters.statuses.filter((item) => item !== st),
                })
              }
              onResetDealType={() => handleFilterChange({ ...filters, dealType: 'all' })}
              onResetMinIrr={() => handleFilterChange({ ...filters, minIrr: 5 })}
              onResetMinInvestment={() =>
                handleFilterChange({ ...filters, minInvestmentMax: 100000 })
              }
              onClearAll={handleResetFilters}
            />

            {/* Sort Dropdown & Density Toggle */}
            <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
              {/* Sort Selector */}
              <div className="flex items-center gap-1.5 text-xs text-[#9E9DA0]">
                <span>Sort:</span>
                <select
                  value={sortOption}
                  onChange={(e) => handleSortChange(e.target.value as SortOption)}
                  data-testid="marketplace-sort-select"
                  aria-label="Sort deals by"
                  className="rounded-lg border border-white/10 bg-[#161318] px-2.5 py-1.5 text-xs font-semibold text-[#fdfffc] outline-none focus:border-[var(--accent)] cursor-pointer"
                >
                  <option value="recommended">Recommended</option>
                  <option value="newest">Newest</option>
                  <option value="highest_irr">Highest IRR</option>
                  <option value="lowest_min">Lowest Min Check</option>
                  <option value="closing_soon">Closing Soonest</option>
                </select>
              </div>

              {/* Density Toggle (Desktop) */}
              <div className="hidden sm:flex items-center rounded-lg border border-white/10 bg-[#161318] p-0.5">
                <button
                  type="button"
                  data-testid="toggle-view-grid"
                  onClick={() => handleDensityChange('grid')}
                  className={`p-1.5 rounded transition ${density === 'grid' ? 'bg-white/15 text-white' : 'text-[#9E9DA0] hover:text-white'}`}
                  aria-label="Grid view"
                >
                  <span className="material-symbols-outlined text-[18px]">grid_view</span>
                </button>
                <button
                  type="button"
                  data-testid="toggle-view-table"
                  onClick={() => handleDensityChange('table')}
                  className={`p-1.5 rounded transition ${density === 'table' ? 'bg-white/15 text-white' : 'text-[#9E9DA0] hover:text-white'}`}
                  aria-label="Dense table view"
                >
                  <span className="material-symbols-outlined text-[18px]">table_rows</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4. States: Loading Skeletons (F-09 Exact Geometry w/ 8% Pulse on --bg-elevated) */}
          {loading && (
            <div
              data-testid="marketplace-loading-skeletons"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
            >
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/10 bg-[#121014] overflow-hidden"
                >
                  <div className="aspect-[16/9] w-full skeleton-pulse" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 w-3/4 rounded skeleton-pulse" />
                    <div className="h-3 w-1/2 rounded skeleton-pulse" />
                    <div className="my-4 border-y border-white/10 py-3 grid grid-cols-4 gap-2">
                      <div className="h-8 rounded skeleton-pulse" />
                      <div className="h-8 rounded skeleton-pulse" />
                      <div className="h-8 rounded skeleton-pulse" />
                      <div className="h-8 rounded skeleton-pulse" />
                    </div>
                    <div className="h-2 w-full rounded-full skeleton-pulse" />
                    <div className="h-10 w-full rounded-lg skeleton-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State — Human, Specific, Actionable Copy */}
          {!loading && error && (
            <div
              data-testid="marketplace-error-state"
              className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center"
            >
              <span className="material-symbols-outlined text-4xl text-red-400">error</span>
              <h3 className="mt-2 text-base font-bold text-white">We couldn&apos;t load deals for this filter</h3>
              <p className="mt-1 text-xs text-white/70 max-w-md mx-auto">
                Try removing one of your active filters, or check your connection and retry.
              </p>
              <div className="mt-4">
                <Button variant="secondary" size="sm" onClick={() => loadDeals()}>
                  Retry Connection
                </Button>
              </div>
            </div>
          )}

          {/* No Results Found State */}
          {!loading && !error && sortedDeals.length === 0 && (
            <div
              data-testid="marketplace-no-results"
              className="rounded-2xl border border-white/10 bg-[#121014] p-12 text-center"
            >
              <span className="material-symbols-outlined text-5xl text-[#9E9DA0]/40">
                search_off
              </span>
              <h3 className="mt-3 text-lg font-bold text-white">No opportunities matched your criteria</h3>
              <p className="mt-1 text-sm text-[#9E9DA0] max-w-md mx-auto">
                {searchQuery ? (
                  <>
                    No listings found matching &quot;<strong className="text-white">{searchQuery}</strong>&quot;.
                    Try relaxing your filters or clearing the search query.
                  </>
                ) : (
                  'Try widening your target IRR or selecting additional asset classes to discover opportunities.'
                )}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button variant="primary" size="md" onClick={handleResetFilters}>
                  Clear All Filters
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => alert('Deal alert saved for this criteria.')}
                  icon={<span className="material-symbols-outlined text-[16px]">notifications</span>}
                >
                  Create Deal Alert
                </Button>
              </div>
            </div>
          )}

          {/* 5. Results: Grid View vs Dense Table View */}
          {!loading && !error && sortedDeals.length > 0 && (
            <>
              {density === 'grid' ? (
                <div
                  id="marketplace-results"
                  data-testid="marketplace-deals-grid"
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
                >
                  {visibleDeals.map((deal, idx) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      tabIndex={getGridTabIndex(idx)}
                      onKeyDown={(e) => handleGridKeyDown(e, idx)}
                    />
                  ))}
                </div>
              ) : (
                <DealsDenseTable deals={visibleDeals} />
              )}

              {/* Infinite Scroll Anchor & Fallback Button */}
              <div ref={observerTargetRef} className="py-6 flex flex-col items-center justify-center">
                {visibleCount < sortedDeals.length ? (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
                    className="min-w-[160px]"
                  >
                    Load More ({sortedDeals.length - visibleCount} remaining)
                  </Button>
                ) : (
                  <p className="text-xs text-[#9E9DA0] font-mono">
                    All {sortedDeals.length} opportunities loaded
                  </p>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Broadcast Deal Modal */}
      {isBroadcastOpen && (
        <DealBroadcastModal
          dealId={allDeals[0]?.id || 'deal-1'}
          dealName={allDeals[0]?.propertyName || allDeals[0]?.name || 'Commercial Deal'}
          dealAddress={allDeals[0]?.address || '1247 Elm St'}
          dealRoi={allDeals[0]?.targetIrr ?? allDeals[0]?.projectedRoi ?? 18.4}
          isOpen={isBroadcastOpen}
          onClose={() => setIsBroadcastOpen(false)}
        />
      )}

      {/* Persistent Compare Tray Dock */}
      <CompareTray />
    </div>
  );
}
