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
import {
  Broadcast,
  PlusCircle,
  Faders,
  SquaresFour,
  Rows,
  X,
  WarningCircle,
  MagnifyingGlass,
  Bell,
  CheckCircle,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { bffFetch } from '@/lib/api/bff-fetch';
import { useOptionalAuth } from '@/context/AuthContext';
import DealBroadcastModal from '@/components/marketplace/DealBroadcastModal';
import DealCalculatorResultModal from '@/components/marketplace/DealCalculatorResultModal';
import ExpressInterestModal from '@/components/marketplace/ExpressInterestModal';
import DealOfferServicesModal from '@/components/marketplace/DealOfferServicesModal';
import CompareTray from '@/components/marketplace/CompareTray';
import MarketplaceSocialProfileCard from '@/components/marketplace/MarketplaceSocialProfileCard';
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

export interface DealsMarketplacePanelProps {
  initialDeals?: DealCardData[];
}

export default function DealsMarketplacePanel({ initialDeals }: DealsMarketplacePanelProps = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Local & remote state
  const [allDeals, setAllDeals] = useState<DealCardData[]>(initialDeals ?? []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [selectedDealForModal, setSelectedDealForModal] = useState<DealCardData | null>(null);
  const [selectedDealForInterest, setSelectedDealForInterest] = useState<DealCardData | null>(null);
  const [selectedDealForOfferServices, setSelectedDealForOfferServices] = useState<DealCardData | null>(null);
  const [interestedDealIds, setInterestedDealIds] = useState<string[]>([]);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [dealAlertSaved, setDealAlertSaved] = useState(false);

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
  const isVendor = (auth?.profile?.accountType || '').toLowerCase() === 'vendor';

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
        const hp = deal.holdPeriod || '3-5 Years';
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

  const handleExpressInterest = (deal: DealCardData) => {
    setSelectedDealForInterest(deal);
  };

  const handleInterestSuccess = (dealId: string) => {
    setInterestedDealIds((prev) => (prev.includes(dealId) ? prev : [...prev, dealId]));
    setAllDeals((prev) =>
      prev.map((d) =>
        d.id === dealId
          ? {
              ...d,
              investorCount: (d.investorCount ?? 4) + 1,
            }
          : d
      )
    );
  };

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
            ? "We couldn't load deals for this filter: try removing one, or retry."
            : `Showing ${sortedDeals.length} deals matching your filters`}
      </div>

      {/* 1. Page Header with Live Status Dot */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-100 sm:text-3xl">
              Deals Marketplace
            </h1>
            <span className="flex items-center gap-1.5 rounded-none border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-none bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-none bg-emerald-400" />
              </span>
              Live
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-400">
            {loading ? (
              'Scanning live market inventory…'
            ) : (
              <>
                <strong className="font-mono text-neutral-100">{sortedDeals.length}</strong> active
                opportunities across{' '}
                <strong className="font-mono text-neutral-100">{marketsCount}</strong> markets
              </>
            )}
          </p>
        </div>

        {/* Secondary Header CTA: Broadcast / Post Deal */}
        {isVendor ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-none border border-neutral-800 bg-neutral-900/60 px-3.5 py-2 text-xs">
            <span className="font-semibold text-neutral-100">Vendor Search Mode:</span>
            <span className="text-neutral-400">
              Discover active projects and submit trade/service proposals to operators.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsBroadcastOpen(true)}
              icon={<Broadcast className="h-4 w-4" />}
            >
              Broadcast Deal
            </Button>
            <Button
              variant="primary"
              size="sm"
              href="/deal-calculator?post=true"
              data-testid="marketplace-post-deal-btn"
              icon={<PlusCircle className="h-4 w-4" />}
            >
              + Post Deal to Marketplace
            </Button>
          </div>
        )}
      </header>

      {/* Investor Profile & Social Network Bar */}
      <MarketplaceSocialProfileCard variant="banner" contextLabel="Deals Marketplace" />

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
            icon={<Faders className="h-4 w-4" />}
          >
            Filters ({filters.assetClasses.length + filters.markets.length + (filters.dealType !== 'all' ? 1 : 0)})
          </Button>

          {/* Density Toggle (Mobile) */}
          <div className="flex items-center rounded-none border border-neutral-800 bg-neutral-900/50 p-0.5">
            <button
              type="button"
              onClick={() => handleDensityChange('grid')}
              className={`p-1.5 rounded-none ${density === 'grid' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400'}`}
              aria-label="Grid view"
            >
              <SquaresFour className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDensityChange('table')}
              className={`p-1.5 rounded-none ${density === 'table' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400'}`}
              aria-label="Table view"
            >
              <Rows className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile Filter Modal */}
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm lg:hidden">
            <div className="w-full max-h-[85vh] overflow-y-auto rounded-none border-t border-neutral-800 bg-neutral-950 p-5">
              <div className="mb-4 flex items-center justify-between border-b border-neutral-800 pb-3">
                <h3 className="text-base font-bold text-neutral-100">Filters</h3>
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="rounded-none p-1 text-neutral-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-none border border-neutral-800 bg-neutral-900/40 p-3.5 shadow-sm">
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
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <span>Sort:</span>
                <select
                  value={sortOption}
                  onChange={(e) => handleSortChange(e.target.value as SortOption)}
                  data-testid="marketplace-sort-select"
                  aria-label="Sort deals by"
                  className="rounded-none border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-base md:text-xs font-semibold text-neutral-100 outline-none focus:border-neutral-600 cursor-pointer"
                >
                  <option value="recommended">Recommended</option>
                  <option value="newest">Newest</option>
                  <option value="highest_irr">Highest IRR</option>
                  <option value="lowest_min">Lowest Min Check</option>
                  <option value="closing_soon">Closing Soonest</option>
                </select>
              </div>

              {/* Density Toggle (Desktop) */}
              <div className="hidden sm:flex items-center rounded-none border border-neutral-800 bg-neutral-900/50 p-0.5">
                <button
                  type="button"
                  data-testid="toggle-view-grid"
                  onClick={() => handleDensityChange('grid')}
                  className={`p-1.5 rounded-none transition ${density === 'grid' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-white'}`}
                  aria-label="Grid view"
                >
                  <SquaresFour className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  data-testid="toggle-view-table"
                  onClick={() => handleDensityChange('table')}
                  className={`p-1.5 rounded-none transition ${density === 'table' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-white'}`}
                  aria-label="Dense table view"
                >
                  <Rows className="h-4 w-4" />
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
                  className="rounded-none border border-neutral-800 bg-neutral-950 overflow-hidden"
                >
                  <div className="aspect-[16/9] w-full skeleton-pulse" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 w-3/4 rounded-none skeleton-pulse" />
                    <div className="h-3 w-1/2 rounded-none skeleton-pulse" />
                    <div className="my-4 border-y border-neutral-800 py-3 grid grid-cols-4 gap-2">
                      <div className="h-8 rounded-none skeleton-pulse" />
                      <div className="h-8 rounded-none skeleton-pulse" />
                      <div className="h-8 rounded-none skeleton-pulse" />
                      <div className="h-8 rounded-none skeleton-pulse" />
                    </div>
                    <div className="h-2 w-full rounded-none skeleton-pulse" />
                    <div className="h-10 w-full rounded-none skeleton-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State: Human, Specific, Actionable Copy */}
          {!loading && error && (
            <div
              data-testid="marketplace-error-state"
              className="rounded-none border border-red-500/30 bg-red-500/10 p-8 text-center"
            >
              <WarningCircle className="mx-auto h-10 w-10 text-red-400" />
              <h3 className="mt-2 text-base font-bold text-neutral-100">We couldn&apos;t load deals for this filter</h3>
              <p className="mt-1 text-xs text-neutral-400 max-w-md mx-auto">
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
              className="rounded-none border border-neutral-800 bg-neutral-950 p-12 text-center"
            >
              <MagnifyingGlass className="mx-auto h-12 w-12 text-neutral-600" />
              <h3 className="mt-3 text-lg font-bold text-neutral-100">No opportunities matched your criteria</h3>
              <p className="mt-1 text-sm text-neutral-400 max-w-md mx-auto">
                {searchQuery ? (
                  <>
                    No listings found matching &quot;<strong className="text-neutral-100">{searchQuery}</strong>&quot;.
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
                  onClick={() => setDealAlertSaved(true)}
                  icon={<Bell className="h-4 w-4" />}
                >
                  Create Deal Alert
                </Button>
              </div>
              {dealAlertSaved && (
                <div
                  role="status"
                  className="mt-5 max-w-md mx-auto flex items-center justify-between gap-3 rounded-none border border-neutral-700 bg-neutral-800 p-3.5 text-xs text-neutral-200"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <span>Deal alert created. You will receive notifications when matching opportunities are listed.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDealAlertSaved(false)}
                    className="text-neutral-400 hover:text-white underline text-xs shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              )}
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
                      onViewCalculatorModal={(d) => setSelectedDealForModal(d)}
                      onExpressInterest={handleExpressInterest}
                      onOfferServices={(d) => setSelectedDealForOfferServices(d)}
                      isInterested={interestedDealIds.includes(deal.id)}
                      isVendor={isVendor}
                    />
                  ))}
                </div>
              ) : (
                <DealsDenseTable
                  deals={visibleDeals}
                  onViewCalculatorModal={(d) => setSelectedDealForModal(d)}
                  onExpressInterest={handleExpressInterest}
                  onOfferServices={(d) => setSelectedDealForOfferServices(d)}
                  interestedDealIds={interestedDealIds}
                  isVendor={isVendor}
                />
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

      {/* Deal Calculator & Crowdfund Results Modal */}
      {selectedDealForModal && (
        <DealCalculatorResultModal
          deal={selectedDealForModal}
          isOpen={Boolean(selectedDealForModal)}
          onClose={() => setSelectedDealForModal(null)}
          onExpressInterest={handleExpressInterest}
          isInterested={interestedDealIds.includes(selectedDealForModal.id)}
          onCommitSuccess={(amount) => {
            setInterestedDealIds((prev) =>
              prev.includes(selectedDealForModal.id) ? prev : [...prev, selectedDealForModal.id]
            );
            setAllDeals((prev) =>
              prev.map((d) =>
                d.id === selectedDealForModal.id
                  ? {
                      ...d,
                      committedAmount: (d.committedAmount ?? d.committed ?? 0) + amount,
                      committed: (d.committed ?? 0) + amount,
                      investorCount: (d.investorCount ?? 4) + 1,
                    }
                  : d
              )
            );
          }}
        />
      )}

      {/* Express Interest in Project Modal */}
      {selectedDealForInterest && (
        <ExpressInterestModal
          deal={selectedDealForInterest}
          isOpen={Boolean(selectedDealForInterest)}
          onClose={() => setSelectedDealForInterest(null)}
          onSuccessToast={() => {
            handleInterestSuccess(selectedDealForInterest.id);
            setSelectedDealForInterest(null);
          }}
        />
      )}

      {/* Offer Services on Deal Modal */}
      {selectedDealForOfferServices && (
        <DealOfferServicesModal
          deal={{
            id: selectedDealForOfferServices.id,
            slug: selectedDealForOfferServices.slug,
            name: selectedDealForOfferServices.name,
            propertyName: selectedDealForOfferServices.propertyName,
            address: selectedDealForOfferServices.address,
            city: selectedDealForOfferServices.city,
            state: selectedDealForOfferServices.state,
            assetClass: selectedDealForOfferServices.assetClass,
            creatorName: selectedDealForOfferServices.creatorName,
          }}
          isOpen={Boolean(selectedDealForOfferServices)}
          onClose={() => setSelectedDealForOfferServices(null)}
        />
      )}

      {/* Persistent Compare Tray Dock */}
      <CompareTray />
    </div>
  );
}
