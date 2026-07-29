'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getPublishedListings, searchDealsAuthenticated } from '@/actions/listings';
import type { DealListingTeaser, SubscriberPropertyResult, SubscriberDealMatch, ResolvedAddress, DealSortOption } from '@/types/listing';
import SubscriberDealCard from '@/components/listings/SubscriberDealCard';
import ListingCard from '@/components/listings/ListingCard';
import { MapPin, Search, Loader2, X, Building2, Plus, ArrowRight, Compass } from 'lucide-react';
import { recordSearchTelemetry, recordConversionTelemetry } from '@/actions/telemetry';
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import dynamic from 'next/dynamic';
import { calculateDealCompleteness } from '@/lib/identity/provenance';

const DealMap = dynamic(() => import('@/components/marketplace/DealMap'), { ssr: false });

/* ═══════════════════════════════════════════════════════════════
   Discover Deals — Subscriber Marketplace Search (DM-10)
   
   Features:
   - Primary Address Search with Autocomplete (authenticated route)
   - UUIDv4 session tokens regenerated per search session
   - Grouping by Property with Multiple Deal Badges (DM-D3)
   - Exact engine-derived metrics & Honesty Rule gap handling
   - Subscriber Zero-Result conversion flow ("Start a Deal here")
   ═══════════════════════════════════════════════════════════════ */

const ASSET_CLASSES = ['All', 'Residential', 'Multi-Family', 'Commercial', 'Land'] as const;
const STRATEGIES   = ['All', 'FLIP', 'BRRRR', 'BUY AND HOLD', 'WHOLESALE'] as const;

type AssetClassFilter = (typeof ASSET_CLASSES)[number];
type StrategyFilter   = (typeof STRATEGIES)[number];

interface Prediction {
  placeId: string;
  description: string;
}

// ── Skeleton Loader ──
function SkeletonCard() {
  return (
    <div className="glass-card rounded-xl border border-pw-border p-5 animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-4 w-16 rounded-full bg-[var(--color-muted)]/15" />
        <div className="h-4 w-12 rounded-full bg-[var(--color-muted)]/10" />
      </div>
      <div className="h-5 w-3/4 rounded bg-[var(--color-muted)]/15 mb-2" />
      <div className="h-4 w-1/2 rounded bg-[var(--color-muted)]/10 mb-4" />
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="h-10 rounded-lg bg-[var(--color-muted)]/10" />
        <div className="h-10 rounded-lg bg-[var(--color-muted)]/10" />
      </div>
      <div className="flex items-center gap-2 mt-auto">
        <div className="h-6 w-6 rounded-full bg-[var(--color-muted)]/15" />
        <div className="h-3 w-24 rounded bg-[var(--color-muted)]/10" />
      </div>
    </div>
  );
}

export default function DealsPage() {
  const { user, profile } = useAuth();
  const router = useRouter();

  // Filter state
  const [assetClass, setAssetClass] = useState<AssetClassFilter>('All');
  const [strategy, setStrategy]     = useState<StrategyFilter>('All');
  
  // Search and loading states
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isPredictionsOpen, setIsPredictionsOpen] = useState(false);
  const [isPredictionsLoading, setIsPredictionsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [sessionToken, setSessionToken] = useState<string>('');
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SubscriberPropertyResult[] | null>(null);
  const [coldStartResult, setColdStartResult] = useState<{ address: string; resolvedAddress?: ResolvedAddress } | null>(null);
  const [sortBy, setSortBy] = useState<DealSortOption>('relevance');
  const [activeView, setActiveView] = useState<'list' | 'map'>('list');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Load view choice from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('pw_deals_view');
    if (saved === 'list' || saved === 'map') {
      setActiveView(saved);
    }
  }, []);

  const handleViewChange = (view: 'list' | 'map') => {
    setActiveView(view);
    localStorage.setItem('pw_deals_view', view);
  };
  
  // Default Browse State
  const [defaultTeasers, setDefaultTeasers] = useState<DealListingTeaser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isVendor = profile?.accountType === 'vendor' || profile?.role === 'Vendor' || profile?.subscriptionPlan === 'Vendor Network' || (typeof document !== 'undefined' && (document.cookie.includes('mock_user_role=Vendor') || document.cookie.includes('mock_user_account_type=vendor')));

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Generate UUIDv4 session token on mount / reset
  const generateNewSessionToken = useCallback(() => {
    const token = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    setSessionToken(token);
  }, []);

  useEffect(() => {
    generateNewSessionToken();
  }, [generateNewSessionToken]);

  // Track filter changes to capture telemetry conversions (DM-15)
  useEffect(() => {
    if (assetClass !== 'All') {
      recordConversionTelemetry({
        eventType: 'filter_used',
        details: { filterType: 'assetClass', filterValue: assetClass },
        sessionToken,
      }).catch(console.error);
    }
  }, [assetClass, sessionToken]);

  useEffect(() => {
    if (strategy !== 'All') {
      recordConversionTelemetry({
        eventType: 'filter_used',
        details: { filterType: 'strategy', filterValue: strategy },
        sessionToken,
      }).catch(console.error);
    }
  }, [strategy, sessionToken]);

  useEffect(() => {
    if (sortBy !== 'relevance') {
      recordConversionTelemetry({
        eventType: 'filter_used',
        details: { filterType: 'sortBy', filterValue: sortBy },
        sessionToken,
      }).catch(console.error);
    }
  }, [sortBy, sessionToken]);

  // Fetch all default listings when not searching
  const fetchDefaultListings = useCallback(async () => {
    if (isVendor) {
      setDefaultTeasers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const filters: { assetClass?: string; subStrategy?: string } = {};
      if (assetClass !== 'All') filters.assetClass = assetClass;
      if (strategy !== 'All')   filters.subStrategy = strategy;

      const data = await getPublishedListings(filters);
      setDefaultTeasers(data);
    } catch (err) {
      console.error('Failed to fetch default deals:', err);
      setError('Unable to load deal listings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [assetClass, strategy, isVendor]);

  useEffect(() => {
    if (!searchResults && !coldStartResult) {
      fetchDefaultListings();
    }
  }, [fetchDefaultListings, searchResults, coldStartResult]);

  // Telemetry for page/filters view
  useEffect(() => {
    const filters: Record<string, string> = {};
    if (assetClass !== 'All') filters.assetClass = assetClass;
    if (strategy !== 'All')   filters.subStrategy = strategy;

    posthog.capture('deal_discovery_viewed', { filters, isSearchActive: !!searchResults });
  }, [assetClass, strategy, searchResults]);

  // ── Autocomplete predictions fetch ──
  const fetchPredictions = useCallback(async (input: string) => {
    if (input.trim().length < 3) {
      setPredictions([]);
      setIsPredictionsOpen(false);
      return;
    }

    setIsPredictionsLoading(true);

    try {
      const idToken = user ? await user.getIdToken() : 'mock_token';
      const res = await fetch('/api/places/autocomplete', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ input: input.trim(), sessionToken }),
      });

      if (!res.ok) {
        setPredictions([]);
        setIsPredictionsOpen(false);
        return;
      }

      const data = await res.json();
      setPredictions(data.predictions || []);
      setIsPredictionsOpen((data.predictions || []).length > 0);
      setSelectedIndex(-1);
    } catch {
      setPredictions([]);
      setIsPredictionsOpen(false);
    } finally {
      setIsPredictionsLoading(false);
    }
  }, [sessionToken, user]);

  // ── Debounced Input Change ──
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      fetchPredictions(value);
    }, 300);
  };

  // ── Execute Search ──
  const executeSearch = useCallback(async (addressStr: string, placeId?: string, currentSort = sortBy) => {
    if (isVendor) return;
    setIsSearching(true);
    setError(null);
    setPredictions([]);
    setIsPredictionsOpen(false);

    try {
      const idToken = user ? await user.getIdToken() : 'mock_token';
      const result = await searchDealsAuthenticated(idToken, addressStr, placeId, currentSort);

      let resultCount = 0;
      let resolved = false;

      if (result.mode === 'results' && result.results) {
        resultCount = result.results.length;
        resolved = true;
        setSearchResults(result.results);
        setColdStartResult(null);
      } else {
        resultCount = 0;
        resolved = !!result.resolvedAddress;
        setSearchResults([]);
        setColdStartResult({
          address: result.address || addressStr,
          resolvedAddress: result.resolvedAddress,
        });
      }

      // Record search telemetry asynchronously
      recordSearchTelemetry({
        query: addressStr,
        placeId: placeId || result.resolvedAddress?.placeId || null,
        resultCount,
        resolved,
        sessionToken,
      }).catch(console.error);
      
      // Regenerate token for next search session
      generateNewSessionToken();
    } catch (err: any) {
      console.error('Search execution failed:', err);
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [user, isVendor, generateNewSessionToken, sortBy, sessionToken]);

  // ── Sort Option Change Handler ──
  const handleSortChange = (newSort: DealSortOption) => {
    setSortBy(newSort);
    if (query.trim().length >= 5) {
      executeSearch(query, undefined, newSort);
    }
  };

  // ── Selection Handler ──
  const handleSelectPrediction = async (prediction: Prediction) => {
    setQuery(prediction.description);
    await executeSearch(prediction.description, prediction.placeId);
  };

  // ── Keyboard Navigation ──
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isPredictionsOpen || predictions.length === 0) {
      if (e.key === 'Enter' && query.trim().length >= 5) {
        e.preventDefault();
        executeSearch(query);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, predictions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < predictions.length) {
          handleSelectPrediction(predictions[selectedIndex]);
        } else {
          executeSearch(query);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsPredictionsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // ── Clear Search ──
  const handleClearSearch = () => {
    setQuery('');
    setPredictions([]);
    setIsPredictionsOpen(false);
    setSearchResults(null);
    setColdStartResult(null);
    setError(null);
    inputRef.current?.focus();
  };

  // ── Start a Deal (Stash and Route) ──
  const handleStartDeal = (resolvedAddress: ResolvedAddress) => {
    if (!resolvedAddress) return;
    
    sessionStorage.setItem('pw_pending_project_address', JSON.stringify({
      placeId: resolvedAddress.placeId,
      formattedAddress: resolvedAddress.formattedAddress,
      streetNumber: resolvedAddress.addressLine.split(' ')[0] || '',
      route: resolvedAddress.addressLine.split(' ').slice(1).join(' ') || '',
      city: resolvedAddress.city,
      state: resolvedAddress.state,
      zip: resolvedAddress.zip,
      lat: resolvedAddress.lat,
      lng: resolvedAddress.lng,
    }));

    recordConversionTelemetry({
      eventType: 'deal_create',
      sessionToken,
      details: { address: resolvedAddress.formattedAddress },
    }).catch(console.error);

    router.push('/dashboard/projects/new');
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsPredictionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Filter listings based on chip selection (applies to both search results and browse state)
  const filterDeals = useCallback((deals: SubscriberDealMatch[]) => {
    return deals.filter((d) => {
      const acMatch = assetClass === 'All' || d.listing.assetClass === assetClass;
      const stMatch = strategy === 'All' || d.listing.subStrategy === strategy;
      return acMatch && stMatch;
    });
  }, [assetClass, strategy]);

  const filterTeasers = useCallback((teasersList: DealListingTeaser[]) => {
    return teasersList.filter((t) => {
      const acMatch = assetClass === 'All' || t.assetClass === assetClass;
      const stMatch = strategy === 'All' || t.subStrategy === strategy;
      return acMatch && stMatch;
    });
  }, [assetClass, strategy]);

  const sortTeasers = useCallback((teasersList: DealListingTeaser[]) => {
    return [...teasersList].sort((a, b) => {
      if (sortBy === 'freshness') {
        const timeA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const timeB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return timeB - timeA;
      } else if (sortBy === 'activity') {
        return (b.followCount || 0) - (a.followCount || 0);
      } else if (sortBy === 'price_asc') {
        const priceA = parseFloat((a.askingPriceApprox || '').replace(/[^0-9.]/g, '')) || 0;
        const priceB = parseFloat((b.askingPriceApprox || '').replace(/[^0-9.]/g, '')) || 0;
        return priceA - priceB;
      } else if (sortBy === 'price_desc') {
        const priceA = parseFloat((a.askingPriceApprox || '').replace(/[^0-9.]/g, '')) || 0;
        const priceB = parseFloat((b.askingPriceApprox || '').replace(/[^0-9.]/g, '')) || 0;
        return priceB - priceA;
      } else {
        // Relevance for teasers: 60% freshness (last 30 days) + 40% follow activity (up to 10 follows)
        const timeA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const timeB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        const ageA = Math.max(0, Date.now() - timeA);
        const ageB = Math.max(0, Date.now() - timeB);
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const freshA = Math.max(0, 1 - ageA / thirtyDaysMs);
        const freshB = Math.max(0, 1 - ageB / thirtyDaysMs);
        
        const actA = Math.min((a.followCount || 0) / 10, 1);
        const actB = Math.min((b.followCount || 0) / 10, 1);
        
        const scoreA = 0.60 * freshA + 0.40 * actA;
        const scoreB = 0.60 * freshB + 0.40 * actB;
        return scoreB - scoreA;
      }
    });
  }, [sortBy]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 py-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-on-surface)] flex items-center gap-2">
            <Compass className="w-6 h-6 text-[var(--color-primary)]" />
            Discover Deals
          </h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Browse published deal listings or search street addresses to unlock detailed financial underwriting.
          </p>
        </div>
      </div>

      {/* ── Search Bar Section (Sticky on scroll) ── */}
      {!isVendor && (
        <div className="sticky top-0 z-40 bg-[var(--bg-canvas)]/95 backdrop-blur-md py-3.5 -mx-4 px-4 md:-mx-0 md:px-0 border-b border-pw-border/5">
          <div ref={containerRef} className="relative w-full max-w-2xl">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                {/* Search Icon */}
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  {isPredictionsLoading ? (
                    <Loader2 className="w-5 h-5 text-[var(--color-primary)] animate-spin" />
                  ) : (
                    <Search className="w-5 h-5 text-[var(--color-muted)]" />
                  )}
                </div>

                {/* Input */}
                <input
                  ref={inputRef}
                  id="subscriber-deal-search"
                  type="text"
                  value={query}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => predictions.length > 0 && setIsPredictionsOpen(true)}
                  placeholder="Search by street address — e.g. 123 Main St, Miami FL"
                  autoComplete="off"
                  className="
                    w-full h-12 md:h-14
                    pl-12 pr-12
                    bg-surface-container/60 backdrop-blur-sm
                    border border-pw-border
                    rounded-xl
                    text-sm md:text-base text-[var(--color-on-surface)]
                    placeholder:text-[var(--color-muted)]/50
                    focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]/40
                    transition-all duration-200
                  "
                />

                {/* Clear Button */}
                {query && (
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="p-1 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-on-surface)] hover:bg-surface-container-high/60 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Filter Toggle Button (Reachable in one tap) */}
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(true)}
                className="md:hidden relative flex items-center justify-center h-12 w-12 rounded-xl border border-pw-border bg-surface-container/60 text-[var(--color-on-surface)] transition-all active:scale-[0.95] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">filter_list</span>
                {((assetClass !== 'All' ? 1 : 0) + (strategy !== 'All' ? 1 : 0)) > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--color-primary)] text-[10px] text-[#FDFFFC] font-extrabold flex items-center justify-center rounded-full border border-[var(--bg-canvas)] shadow-md animate-pulse">
                    {(assetClass !== 'All' ? 1 : 0) + (strategy !== 'All' ? 1 : 0)}
                  </span>
                )}
              </button>
            </div>

            {/* Autocomplete predictions list */}
            {isPredictionsOpen && predictions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-surface-container/95 border border-pw-border rounded-xl shadow-2xl overflow-hidden">
                <ul className="py-1">
                  {predictions.map((p, i) => (
                    <li
                      key={p.placeId}
                      role="option"
                      aria-selected={i === selectedIndex}
                      onClick={() => handleSelectPrediction(p)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`
                        flex items-center gap-3 px-4 py-2.5 cursor-pointer text-xs md:text-sm text-[var(--color-on-surface)]
                        transition-colors duration-100
                        ${i === selectedIndex ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'hover:bg-surface-container-high/40'}
                      `}
                    >
                      <MapPin className="w-4 h-4 flex-shrink-0 text-[var(--color-muted)]" />
                      <span className="truncate">{p.description}</span>
                    </li>
                  ))}
                </ul>
                <div className="px-4 py-2 border-t border-pw-border flex justify-end bg-surface-container-high/20">
                  <span className="text-xs text-[var(--color-muted)] font-bold tracking-wide uppercase">
                    Powered by Google
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Filter Chips & Sorting (DM-12) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div className="hidden md:flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-2">
          {/* Asset Class */}
          <div className="flex flex-wrap gap-2">
            {ASSET_CLASSES.map((ac) => (
              <Chip
                key={ac}
                label={ac}
                value={ac}
                active={assetClass === ac}
                onClick={setAssetClass}
              />
            ))}
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-6 self-center bg-pw-border" />

          {/* Strategy */}
          <div className="flex flex-wrap gap-2">
            {STRATEGIES.map((s) => (
              <Chip
                key={s}
                label={s}
                value={s}
                active={strategy === s}
                onClick={setStrategy}
              />
            ))}
          </div>
        </div>

        {/* Mobile Filter Bottom Drawer (DM-14) */}
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 md:hidden animate-fade-in">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsMobileFilterOpen(false)}
            />
            {/* Drawer Sheet */}
            <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-[var(--bg-canvas)] border-t border-pw-border rounded-t-2xl p-6 space-y-6 flex flex-col justify-between overflow-y-auto animate-slide-up">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-extrabold text-[var(--color-on-surface)]">
                    Filter Listings
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="p-2 rounded-xl text-[var(--color-muted)] hover:bg-surface-container-high/60 active:scale-[0.95]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Asset Class */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                    Asset Class
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ASSET_CLASSES.map((ac) => (
                      <button
                        key={ac}
                        onClick={() => setAssetClass(ac)}
                        className={`h-11 flex items-center justify-center rounded-xl text-xs font-bold uppercase tracking-wide border transition-all ${
                          assetClass === ac
                            ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border-[var(--color-primary)]/30'
                            : 'text-[var(--color-muted)] border-pw-border hover:border-[var(--color-primary)]/20'
                        }`}
                      >
                        {ac}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Strategy */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                    Strategy
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {STRATEGIES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setStrategy(s)}
                        className={`h-11 flex items-center justify-center rounded-xl text-xs font-bold uppercase tracking-wide border transition-all ${
                          strategy === s
                            ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border-[var(--color-primary)]/30'
                            : 'text-[var(--color-muted)] border-pw-border hover:border-[var(--color-primary)]/20'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-pw-border flex gap-3">
                {(assetClass !== 'All' || strategy !== 'All') && (
                  <button
                    type="button"
                    onClick={() => {
                      setAssetClass('All');
                      setStrategy('All');
                    }}
                    className="flex-1 h-12 flex items-center justify-center rounded-xl border border-pw-border text-xs font-bold uppercase tracking-wide text-[var(--color-on-surface)] transition-all active:scale-[0.98]"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="flex-1 h-12 flex items-center justify-center rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold uppercase tracking-wide transition-all active:scale-[0.98]"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sort Dropdown & View Switcher */}
        {!isVendor && (
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
                Sort By:
              </span>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as any)}
                className="
                  h-9 px-3
                  bg-surface-container/60 backdrop-blur-sm
                  border border-pw-border
                  rounded-lg
                  text-xs font-bold text-[var(--color-on-surface)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]/40
                  transition-all duration-200
                  cursor-pointer
                "
              >
                <option value="relevance">Relevance (Default)</option>
                <option value="freshness">Freshness (Newest)</option>
                <option value="yield">Highest Yield (CoC)</option>
                <option value="activity">Most Active (Follows)</option>
                <option value="price_asc">Lowest Price</option>
                <option value="price_desc">Highest Price</option>
              </select>
            </div>

            <div className="flex bg-surface-container-high/60 rounded-lg p-0.5 border border-pw-border h-9">
              <button
                type="button"
                onClick={() => handleViewChange('list')}
                data-testid="view-switch-list"
                className={`px-3 flex items-center gap-1.5 rounded-md text-xs font-bold uppercase transition-all duration-200 cursor-pointer ${
                  activeView === 'list'
                    ? 'bg-[var(--color-primary)] text-[#FDFFFC] shadow'
                    : 'text-[var(--color-on-surface-variant)]/60 hover:text-[var(--color-on-surface)]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">list</span>
                <span>List</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewChange('map')}
                data-testid="view-switch-map"
                className={`px-3 flex items-center gap-1.5 rounded-md text-xs font-bold uppercase transition-all duration-200 cursor-pointer ${
                  activeView === 'map'
                    ? 'bg-[var(--color-primary)] text-[#FDFFFC] shadow'
                    : 'text-[var(--color-on-surface-variant)]/60 hover:text-[var(--color-on-surface)]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">map</span>
                <span>Map</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Sorting Disclosure Banner (DM-12 transparency rule) ── */}
      {!isVendor && sortBy === 'relevance' && (searchResults !== null || defaultTeasers.length > 0) && (
        <div className="flex items-start gap-2.5 rounded-xl border border-pw-border bg-surface-container-low/10 p-3.5 text-xs text-[var(--color-muted)] max-w-2xl">
          <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)] mt-0.5 select-none">
            info
          </span>
          <div className="space-y-1">
            <p className="font-semibold text-[var(--color-on-surface)]">
              Default Sorting: Relevance Rank
            </p>
            <p className="leading-relaxed">
              Default search relevance balances deal freshness (40%), Cash-on-Cash yield (35%), and public follow activity (25%). Placement is organic — placement on this marketplace is not for sale.
            </p>
          </div>
        </div>
      )}

      {/* ── Search Summary (Completeness beside the query) ── */}
      {(() => {
        if (searchResults === null || searchResults.length === 0) return null;
        let totalScore = 0;
        let count = 0;
        searchResults.forEach((group) => {
          const filteredDeals = filterDeals(group.deals);
          filteredDeals.forEach((d) => {
            const comp = calculateDealCompleteness(d.project);
            totalScore += comp.score;
            count++;
          });
        });
        const avgScore = count > 0 ? Math.round(totalScore / count) : 0;
        const totalMatches = searchResults.reduce((sum, g) => sum + filterDeals(g.deals).length, 0);
        return (
          <div className="flex items-center gap-2 mt-3 mb-2 animate-in fade-in duration-300">
            <span 
              className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] bg-surface-container/40 px-3 py-1 rounded-lg border border-pw-border flex items-center gap-1.5"
              data-testid="search-completeness-summary"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Query Matches: {totalMatches} Deals
              <span className="text-white/40">|</span>
              Average Completeness: {avgScore}%
            </span>
          </div>
        );
      })()}

      {/* ── Content Grid ── */}
      {isSearching ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin mb-3" />
          <p className="text-sm text-[var(--color-muted)]">Analyzing underwriting records…</p>
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl border border-red-500/20 p-6 text-center max-w-lg mx-auto">
          <span className="material-symbols-outlined text-3xl text-red-400 block mb-2">error</span>
          <p className="text-sm text-red-400 font-semibold">{error}</p>
          <button
            onClick={query ? () => executeSearch(query) : fetchDefaultListings}
            className="mt-4 px-4 py-2 rounded-lg text-xs font-bold uppercase bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : isVendor ? (
        /* Vendor Blocked State */
        <div className="glass-card rounded-2xl border border-pw-border p-12 text-center max-w-lg mx-auto" id="vendor-blocked-state">
          <span className="material-symbols-outlined text-4xl text-[var(--color-muted)] block mb-4">block</span>
          <h3 className="text-lg font-bold text-[var(--color-on-surface)] mb-2">Access Restricted</h3>
          <p className="text-sm text-[var(--color-muted)]">
            Deal listings are not available for vendor accounts.
          </p>
        </div>
      ) : searchResults !== null ? (
        /* Active Address Search Results */
        <div className="space-y-8">
          {activeView === 'map' ? (
            <div className="space-y-6">
              {searchResults.length > 0 ? (
                (() => {
                  const filteredProperties = searchResults.map(group => {
                    const filteredDeals = filterDeals(group.deals);
                    if (filteredDeals.length === 0) return null;
                    return {
                      ...group,
                      deals: filteredDeals,
                    };
                  }).filter(Boolean) as SubscriberPropertyResult[];

                  return <DealMap properties={filteredProperties} />;
                })()
              ) : coldStartResult && coldStartResult.resolvedAddress ? (
                <DealMap
                  customMarker={{
                    lat: coldStartResult.resolvedAddress.lat,
                    lng: coldStartResult.resolvedAddress.lng,
                    title: coldStartResult.resolvedAddress.formattedAddress,
                  }}
                  center={{
                    lat: coldStartResult.resolvedAddress.lat,
                    lng: coldStartResult.resolvedAddress.lng,
                  }}
                  zoom={14}
                />
              ) : (
                <DealMap />
              )}

              {/* Zero-result details display if cold start */}
              {searchResults.length === 0 && coldStartResult && (
                <div className="glass-card rounded-2xl border border-pw-border overflow-hidden max-w-xl mx-auto">
                  <div className="relative p-6 md:p-10 text-center">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-[var(--color-primary)]/5 rounded-full blur-[80px] pointer-events-none" />
                    <div className="relative space-y-5">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center">
                        <Building2 className="w-7 h-7 text-[var(--color-primary)]" />
                      </div>
                      {coldStartResult.resolvedAddress ? (
                        <div>
                          <h3 className="text-lg font-bold text-[var(--color-on-surface)] leading-snug">
                            {coldStartResult.resolvedAddress.formattedAddress}
                          </h3>
                          <p className="text-xs text-[var(--color-muted)] mt-1">
                            No active deal postings exist for this property address.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <h3 className="text-lg font-bold text-[var(--color-on-surface)] leading-snug">
                            {coldStartResult.address}
                          </h3>
                          <p className="text-xs text-[var(--color-muted)] mt-1">
                            Could not resolve coordinates or find active listings.
                          </p>
                        </div>
                      )}
                      <div className="pt-2">
                        {coldStartResult.resolvedAddress ? (
                          <button
                            onClick={() => handleStartDeal(coldStartResult.resolvedAddress!)}
                            className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--color-primary)] text-white font-semibold text-sm transition-all duration-200 hover:bg-[var(--color-primary)]/90 hover:shadow-lg hover:shadow-[var(--color-primary)]/20"
                          >
                            Start a Deal here
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                          </button>
                        ) : (
                          <button
                            onClick={handleClearSearch}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-container-high text-[var(--color-on-surface)] font-semibold text-sm border border-pw-border hover:bg-surface-container-highest transition-colors"
                          >
                            Try another address
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* List View */
            searchResults.length > 0 ? (
              (() => {
                const groups = searchResults.map((group) => {
                  const filteredDeals = filterDeals(group.deals);
                  if (filteredDeals.length === 0) return null;

                  return (
                    <div key={group.placeId || group.canonicalAddress} className="space-y-4">
                      {/* Property Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pw-border pb-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center shrink-0">
                            <Building2 className="w-5 h-5 text-[var(--color-primary)]" />
                          </div>
                          <div>
                            <h2 className="text-lg font-bold text-[var(--color-on-surface)]">
                              {group.canonicalAddress}
                            </h2>
                            <p className="text-xs text-[var(--color-muted)] mt-1">
                              {group.city}, {group.state} {group.zipCode}
                            </p>
                          </div>
                        </div>

                        {/* Multiple Deals Signal (DM-D3) */}
                        {filteredDeals.length > 1 && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-1 rounded-full border border-[var(--color-primary)]/25 animate-pulse shrink-0 self-start sm:self-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
                            MULTIPLE ACTIVE DEALS
                          </span>
                        )}
                      </div>

                      {/* Nested deals */}
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredDeals.slice(0, 30).map((match) => (
                          <SubscriberDealCard key={match.listing.id} match={match} />
                        ))}
                        {filteredDeals.length > 30 && (
                          <div className="col-span-full py-2 text-center text-xs text-[var(--color-muted)] font-bold">
                            Showing top 30 active deals at this address. Narrow filters to see others.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }).filter(Boolean);

                if (groups.length === 0) {
                  return (
                    <div className="glass-card rounded-2xl border border-pw-border p-12 text-center">
                      <p className="text-sm text-[var(--color-muted)]">No active deals matching your filters exist at this address.</p>
                    </div>
                  );
                }

                return <div className="space-y-8">{groups}</div>;
              })()
            ) : coldStartResult ? (
              /* Subscriber 0-Result Conversion State */
              <div className="glass-card rounded-2xl border border-pw-border overflow-hidden max-w-xl mx-auto">
                <div className="relative p-6 md:p-10 text-center">
                  {/* Glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-[var(--color-primary)]/5 rounded-full blur-[80px] pointer-events-none" />

                  <div className="relative space-y-5">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center">
                      <Building2 className="w-7 h-7 text-[var(--color-primary)]" />
                    </div>

                    {coldStartResult.resolvedAddress ? (
                      <div>
                        <h3 className="text-lg font-bold text-[var(--color-on-surface)] leading-snug">
                          {coldStartResult.resolvedAddress.formattedAddress}
                        </h3>
                        <p className="text-xs text-[var(--color-muted)] mt-1">
                          No active deal postings exist for this property address.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-lg font-bold text-[var(--color-on-surface)] leading-snug">
                          {coldStartResult.address}
                        </h3>
                        <p className="text-xs text-[var(--color-muted)] mt-1">
                          Could not resolve coordinates or find active listings.
                        </p>
                      </div>
                    )}

                    <div className="pt-2">
                      {coldStartResult.resolvedAddress ? (
                        <button
                          onClick={() => handleStartDeal(coldStartResult.resolvedAddress!)}
                          className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--color-primary)] text-white font-semibold text-sm transition-all duration-200 hover:bg-[var(--color-primary)]/90 hover:shadow-lg hover:shadow-[var(--color-primary)]/20"
                        >
                          Start a Deal here
                          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      ) : (
                        <button
                          onClick={handleClearSearch}
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-container-high text-[var(--color-on-surface)] font-semibold text-sm border border-pw-border hover:bg-surface-container-highest transition-colors"
                        >
                          Try another address
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null
          )}
        </div>
      ) : (
        /* Default Browse Grid (unsearched) */
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-pw-border pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-muted)]">
              All Active Deals
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : activeView === 'map' ? (
            <DealMap deals={sortTeasers(filterTeasers(defaultTeasers))} />
          ) : filterTeasers(defaultTeasers).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sortTeasers(filterTeasers(defaultTeasers)).slice(0, 30).map((t) => (
                <ListingCard key={t.id} teaser={t} />
              ))}
              {filterTeasers(defaultTeasers).length > 30 && (
                <div className="col-span-full py-4 text-center text-xs text-[var(--color-muted)] font-bold">
                  Showing first 30 listings. Use filters to narrow down search results.
                </div>
              )}
            </div>
          ) : (
            <div className="col-span-full glass-card rounded-2xl border border-pw-border p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-[var(--color-muted)] block mb-4">
                storefront
              </span>
              <h3 className="text-lg font-bold text-[var(--color-on-surface)] mb-2">No Deals Found</h3>
              <p className="text-sm text-[var(--color-muted)]">
                No listings match your current filters. Try broadening your criteria.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── Chip Helper ──
  function Chip<T extends string>({
    label,
    value,
    active,
    onClick,
  }: {
    label: string;
    value: T;
    active: boolean;
    onClick: (v: T) => void;
  }) {
    return (
      <button
        onClick={() => onClick(value)}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-[0.05em] transition-all border ${
          active
            ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border-[var(--color-primary)]/30'
            : 'text-[var(--color-muted)] border-pw-border hover:border-[var(--color-primary)]/20'
        }`}
      >
        {label}
      </button>
    );
  }
}
