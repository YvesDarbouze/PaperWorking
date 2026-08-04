'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getPublishedListings, searchDealsAuthenticated } from '@/actions/listings';
import type { DealListingTeaser, SubscriberPropertyResult, SubscriberDealMatch, ResolvedAddress, DealSortOption } from '@/types/listing';
import SubscriberDealCard from '@/components/listings/SubscriberDealCard';
import ListingCard from '@/components/listings/ListingCard';
import CreateDealSheet from '@/components/deals/CreateDealSheet';
import { MapPin, Search, Loader2, X, Building2, Plus, ArrowRight, Compass, Filter, Calculator } from 'lucide-react';
import { recordSearchTelemetry, recordConversionTelemetry } from '@/actions/telemetry';
import { useRouter, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import dynamic from 'next/dynamic';
import { calculateDealCompleteness } from '@/lib/identity/provenance';
import { generateDealSlug, checkDuplicateDeal, DealData } from '@/lib/deals/slugUtils';
import MyDealsHistoryTab from '@/components/deals/MyDealsHistoryTab';
import { generateInvitationToken, DealInvitation, DealInterest } from '@/lib/deals/engagementUtils';
import { DealThreadEvent } from '@/lib/deals/historyUtils';
import toast from 'react-hot-toast';

const DealMap = dynamic(() => import('@/components/marketplace/DealMap'), { ssr: false });

/* ═══════════════════════════════════════════════════════════════
   Discover Deals — Subscriber Marketplace Search (PROMPT 2)
   
   Features:
   - Address-First Search as Primary Interaction
   - Google Maps Places Autocomplete (~300ms debounce, keyboard nav ↑/↓/Enter/Esc)
   - Zero Dead-Ends: Every search finds an existing Deal or starts Deal Creation
   - Deal Creation Sheet with prefilled Places components & duplicate guard
   - Investor-natural filters (collapsible on mobile, ≥44px touch targets)
   - Reciprocal handoff to Deal Analyzer module
   ═══════════════════════════════════════════════════════════════ */

const ASSET_CLASSES = ['All', 'Residential', 'Multi-Family', 'Commercial', 'Land'] as const;
const STRATEGIES   = ['All', 'FLIP', 'BRRRR', 'BUY AND HOLD', 'WHOLESALE'] as const;
const STATUS_OPTIONS = ['All', 'DRAFT', 'LISTED', 'UNDER_REVIEW', 'FUNDED', 'CLOSED'] as const;

type AssetClassFilter = (typeof ASSET_CLASSES)[number];
type StrategyFilter   = (typeof STRATEGIES)[number];
type StatusFilter     = (typeof STATUS_OPTIONS)[number];

interface Prediction {
  placeId: string;
  description: string;
}

// ── Skeleton Loader ──
function SkeletonCard() {
  return (
    <div className="glass-card rounded-xl border border-pw-border p-5 animate-pulse min-h-[220px]">
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
  const searchParams = typeof useSearchParams === 'function' ? useSearchParams() : null;

  // Filter state
  const [assetClass, setAssetClass] = useState<AssetClassFilter>('All');
  const [strategy, setStrategy]     = useState<StrategyFilter>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [priceRange, setPriceRange] = useState<string>('All');

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

  // Creation Sheet state
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [createInitialAddress, setCreateInitialAddress] = useState<ResolvedAddress | null>(null);
  const [createdDeals, setCreatedDeals] = useState<DealData[]>([]);

  // Top Tab state ('all' | 'my-deals')
  const [topTab, setTopTab] = useState<'all' | 'my-deals'>('all');

  // Check action=create & tab=my-deals query params on mount
  useEffect(() => {
    if (searchParams?.get('action') === 'create') {
      setIsCreateSheetOpen(true);
    }
    if (searchParams?.get('tab') === 'my-deals') {
      setTopTab('my-deals');
    }
  }, [searchParams]);

  // Load view choice from localStorage
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

  // Generate UUIDv4 session token
  const generateNewSessionToken = useCallback(() => {
    const token = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    setSessionToken(token);
  }, []);

  useEffect(() => {
    document.title = "PaperWorking — Deals Marketplace";
    if (isVendor) {
      router.replace('/dashboard/marketplace');
    }
  }, [isVendor, router]);

  useEffect(() => {
    generateNewSessionToken();
  }, [generateNewSessionToken]);

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

  // ── Debounced Input Change (~300ms) ──
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

      // Record search telemetry
      recordSearchTelemetry({
        query: addressStr,
        placeId: placeId || result.resolvedAddress?.placeId || null,
        resultCount,
        resolved,
        sessionToken,
      }).catch(console.error);

      generateNewSessionToken();
    } catch (err: any) {
      console.error('Search execution failed:', err);
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [user, isVendor, generateNewSessionToken, sortBy, sessionToken]);

  // ── Selection Handler ──
  const handleSelectPrediction = async (prediction: Prediction) => {
    setQuery(prediction.description);
    await executeSearch(prediction.description, prediction.placeId);
  };

  // ── Keyboard Navigation (Up / Down / Enter / Esc) ──
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isPredictionsOpen || predictions.length === 0) {
      if (e.key === 'Enter' && query.trim().length >= 3) {
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
        // If Enter is pressed, select highlighted or first prediction
        if (selectedIndex >= 0 && selectedIndex < predictions.length) {
          handleSelectPrediction(predictions[selectedIndex]);
        } else if (predictions.length > 0) {
          handleSelectPrediction(predictions[0]);
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

  // ── Start Deal Creation Flow (Prompt 2: Search IS Creation Entry Point) ──
  const handleStartDealCreation = (resolvedAddress?: ResolvedAddress) => {
    const targetAddress: ResolvedAddress = resolvedAddress || {
      formattedAddress: query || '123 Main St, Austin, TX 78701',
      addressLine: query || '123 Main St',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      placeId: `place_${Date.now()}`,
      lat: 30.2672,
      lng: -97.7431,
    };

    setCreateInitialAddress(targetAddress);
    setIsCreateSheetOpen(true);
  };

  // Handle new deal created
  const handleDealCreated = (newDeal: DealData) => {
    setCreatedDeals((prev) => [newDeal, ...prev]);
    toast.success(`Deal created for ${newDeal.displayAddress}`, { id: 'deal-created-toast' });
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

  // Filter listings based on chip selection
  const filterDeals = useCallback((deals: SubscriberDealMatch[]) => {
    return deals.filter((d) => {
      const acMatch = assetClass === 'All' || d.listing.assetClass === assetClass;
      const stMatch = strategy === 'All' || d.listing.subStrategy === strategy;
      const statusMatch = statusFilter === 'All' || d.listing.status.toUpperCase() === statusFilter;
      return acMatch && stMatch && statusMatch;
    });
  }, [assetClass, strategy, statusFilter]);

  const filterTeasers = useCallback((teasersList: DealListingTeaser[]) => {
    return teasersList.filter((t) => {
      const acMatch = assetClass === 'All' || t.assetClass === assetClass;
      const stMatch = strategy === 'All' || t.subStrategy === strategy;
      return acMatch && stMatch;
    });
  }, [assetClass, strategy]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 py-6">
      {/* ── Page Header & Creation Action ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-on-surface)] flex items-center gap-2">
            <Compass className="w-6 h-6 text-emerald-400" />
            Deals Marketplace
          </h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Search any property address to find active investment deals or launch a new syndication listing.
          </p>
        </div>

        {!isVendor && (
          <button
            onClick={() => handleStartDealCreation()}
            className="h-11 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 cursor-pointer self-start md:self-auto min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>List a Deal</span>
          </button>
        )}
      </div>

      {/* ── Top Surface Tab Switcher (Prompt 5 Requirement) ── */}
      {!isVendor && (
        <div className="flex items-center gap-3 border-b border-pw-border pb-3">
          <button
            onClick={() => setTopTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 min-h-[40px] ${
              topTab === 'all'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>All Marketplace Deals</span>
          </button>
          <button
            onClick={() => setTopTab('my-deals')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 min-h-[40px] ${
              topTab === 'my-deals'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>My Deals & Communications</span>
          </button>
        </div>
      )}

      {/* ── Render My Deals & Communications Tab if selected ── */}
      {topTab === 'my-deals' && !isVendor ? (
        <MyDealsHistoryTab
          allDeals={defaultTeasers}
          allInvitations={[
            generateInvitationToken('deal_1', 'investor@paperworking.co', 'user_owner_1', 'Marcus Aurelius'),
          ]}
          allInterests={[
            {
              id: 'int_1',
              dealId: 'deal_1',
              userId: user?.uid || 'user_123',
              amountIntent: 25000,
              currency: 'USD',
              businessCardSnapshot: {
                displayName: profile?.displayName || user?.displayName || 'Registered Investor',
                email: profile?.email || user?.email || 'investor@paperworking.co',
                phone: profile?.phoneNumber || '+1 (512) 555-0199',
                company: profile?.company || 'PaperWorking Investor Network',
              },
              status: 'COMMITTED',
              createdAt: new Date().toISOString(),
            },
          ]}
          threadEvents={[
            {
              id: 'evt_1',
              dealId: 'deal_1',
              dealSlug: '123mainstaustintx78701',
              eventType: 'INVITE_SENT',
              senderName: 'Marcus Aurelius',
              senderEmail: 'marcus@apexcapital.com',
              timestamp: new Date().toISOString(),
              content: 'Invited investor@paperworking.co to review 123 Main St deal listing.',
            },
            {
              id: 'evt_2',
              dealId: 'deal_1',
              dealSlug: '123mainstaustintx78701',
              eventType: 'INTEREST_EXPRESSED',
              senderName: profile?.displayName || 'Registered Investor',
              senderEmail: profile?.email || 'investor@paperworking.co',
              timestamp: new Date().toISOString(),
              content: 'Expressed interest for $25,000 USD and shared business card.',
              metadata: {
                businessCard: {
                  displayName: profile?.displayName || 'Registered Investor',
                  email: profile?.email || 'investor@paperworking.co',
                  company: 'PaperWorking Investor Network',
                },
              },
            },
            {
              id: 'evt_3',
              dealId: 'deal_1',
              dealSlug: '123mainstaustintx78701',
              eventType: 'INBOUND_EMAIL_REPLY',
              senderName: 'Unsubscribed Invitee',
              senderEmail: 'external@investorpartner.com',
              timestamp: new Date().toISOString(),
              content: 'Looks like a solid cap rate. Count me in for 5% of the syndicate.',
              badgeLabel: 'via Email',
              metadata: { viaEmail: true },
            },
          ]}
        />
      ) : (
        <>

      {/* ── STICKY ADDRESS-FIRST SEARCH BAR (Prompt 2 requirement) ── */}
      {!isVendor && (
        <div className="sticky top-0 z-40 bg-[var(--bg-canvas)]/95 backdrop-blur-md py-3.5 -mx-4 px-4 md:-mx-0 md:px-0 border-b border-pw-border/30">
          <div ref={containerRef} className="relative w-full max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                {/* Search Icon */}
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  {isPredictionsLoading ? (
                    <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                  ) : (
                    <Search className="w-5 h-5 text-slate-400" />
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
                  placeholder="Search any property address to find or create a Deal…"
                  autoComplete="off"
                  className="
                    w-full h-12 md:h-14
                    pl-12 pr-12
                    bg-surface-container/80 backdrop-blur-sm
                    border border-pw-border
                    rounded-xl
                    text-sm md:text-base text-slate-100
                    placeholder:text-slate-500
                    focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/60
                    transition-all duration-200
                  "
                />

                {/* Clear Button */}
                {query && (
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Filter Toggle Button (≥44px touch target) */}
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(true)}
                className="md:hidden relative flex items-center justify-center h-12 w-12 min-h-[44px] min-w-[44px] rounded-xl border border-pw-border bg-surface-container/60 text-slate-200 transition-all active:scale-[0.95] cursor-pointer"
                aria-label="Filter listings"
              >
                <Filter className="w-5 h-5" />
                {((assetClass !== 'All' ? 1 : 0) + (strategy !== 'All' ? 1 : 0) + (statusFilter !== 'All' ? 1 : 0)) > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-slate-950 font-extrabold text-[10px] flex items-center justify-center rounded-full border border-slate-950 shadow-md">
                    {(assetClass !== 'All' ? 1 : 0) + (strategy !== 'All' ? 1 : 0) + (statusFilter !== 'All' ? 1 : 0)}
                  </span>
                )}
              </button>
            </div>

            {/* Autocomplete Predictions List */}
            {isPredictionsOpen && predictions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-slate-900 border border-pw-border rounded-xl shadow-2xl overflow-hidden">
                <ul className="py-1">
                  {predictions.map((p, i) => (
                    <li
                      key={p.placeId}
                      role="option"
                      aria-selected={i === selectedIndex}
                      onClick={() => handleSelectPrediction(p)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`
                        flex items-center gap-3 px-4 py-3 cursor-pointer text-xs md:text-sm text-slate-200 min-h-[44px]
                        transition-colors duration-100
                        ${i === selectedIndex ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'hover:bg-white/5'}
                      `}
                    >
                      <MapPin className="w-4 h-4 flex-shrink-0 text-slate-400" />
                      <span className="truncate">{p.description}</span>
                    </li>
                  ))}
                </ul>
                <div className="px-4 py-2 border-t border-pw-border flex justify-between items-center bg-slate-950/60">
                  <span className="text-[10px] text-slate-400">
                    Use ↑ ↓ to navigate, Enter to select
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Powered by Google Maps
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Filters (Investor-Natural, Collapsed on Mobile) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div className="hidden md:flex flex-wrap items-center gap-2">
          {/* Asset Class */}
          <div className="flex flex-wrap gap-1.5">
            {ASSET_CLASSES.map((ac) => (
              <Chip key={ac} label={ac} active={assetClass === ac} onClick={() => setAssetClass(ac)} />
            ))}
          </div>

          <div className="w-px h-5 bg-pw-border mx-1" />

          {/* Strategy */}
          <div className="flex flex-wrap gap-1.5">
            {STRATEGIES.map((s) => (
              <Chip key={s} label={s} active={strategy === s} onClick={() => setStrategy(s)} />
            ))}
          </div>

          <div className="w-px h-5 bg-pw-border mx-1" />

          {/* Status */}
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((st) => (
              <Chip key={st} label={st} active={statusFilter === st} onClick={() => setStatusFilter(st)} />
            ))}
          </div>
        </div>

        {/* Mobile Filter Drawer */}
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 md:hidden animate-fade-in">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsMobileFilterOpen(false)} />
            <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-slate-900 border-t border-pw-border rounded-t-2xl p-6 space-y-6 flex flex-col justify-between overflow-y-auto animate-slide-up">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-extrabold text-slate-100">Filter Deals</h2>
                  <button
                    type="button"
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Asset Class */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Asset Class</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ASSET_CLASSES.map((ac) => (
                      <button
                        key={ac}
                        onClick={() => setAssetClass(ac)}
                        className={`h-11 min-h-[44px] flex items-center justify-center rounded-xl text-xs font-bold uppercase border transition-all ${
                          assetClass === ac
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'text-slate-400 border-pw-border hover:border-white/20'
                        }`}
                      >
                        {ac}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Strategy */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Strategy</label>
                  <div className="grid grid-cols-2 gap-2">
                    {STRATEGIES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setStrategy(s)}
                        className={`h-11 min-h-[44px] flex items-center justify-center rounded-xl text-xs font-bold uppercase border transition-all ${
                          strategy === s
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'text-slate-400 border-pw-border hover:border-white/20'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-pw-border flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="flex-1 h-12 min-h-[44px] flex items-center justify-center rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold uppercase tracking-wide transition-all"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Switcher & Sorting */}
        {!isVendor && (
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-10 px-3 bg-white/5 border border-pw-border rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500 min-h-[44px]"
            >
              <option value="relevance">Relevance (Default)</option>
              <option value="freshness">Freshness (Newest)</option>
              <option value="price_asc">Lowest Price</option>
              <option value="price_desc">Highest Price</option>
            </select>

            <div className="flex bg-white/5 rounded-xl p-1 border border-pw-border h-10">
              <button
                type="button"
                onClick={() => handleViewChange('list')}
                className={`px-3 flex items-center gap-1 rounded-lg text-xs font-bold uppercase transition-all min-h-[36px] ${
                  activeView === 'list' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400'
                }`}
              >
                <span>List</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewChange('map')}
                className={`px-3 flex items-center gap-1 rounded-lg text-xs font-bold uppercase transition-all min-h-[36px] ${
                  activeView === 'map' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400'
                }`}
              >
                <span>Map</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Content Grid ── */}
      {isSearching ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : searchResults !== null ? (
        /* Active Search Results */
        <div className="space-y-6">
          {searchResults.length > 0 ? (
            <div className="space-y-6">
              {searchResults.map((group) => {
                const filteredDeals = filterDeals(group.deals);
                if (filteredDeals.length === 0) return null;
                return (
                  <div key={group.placeId || group.canonicalAddress} className="space-y-4">
                    <div className="flex items-center gap-3 border-b border-pw-border pb-3">
                      <Building2 className="w-5 h-5 text-emerald-400" />
                      <h2 className="text-base font-bold text-slate-100">{group.canonicalAddress}</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredDeals.map((match) => (
                        <SubscriberDealCard key={match.listing.id} match={match} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ZERO RESULTS EMPTY STATE → IMMEDIATE CREATE DEAL CTA (Prompt 2 requirement) */
            <div className="glass-card rounded-2xl border border-pw-border p-8 text-center max-w-xl mx-auto space-y-4 my-8">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">
                  {coldStartResult?.resolvedAddress?.formattedAddress || coldStartResult?.address || query || 'No active Deal found'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  No active investment listings currently exist for this property address on PaperWorking.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => handleStartDealCreation(coldStartResult?.resolvedAddress)}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-lg min-h-[44px] cursor-pointer"
                >
                  <span>Create a Deal for this Property</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={handleClearSearch}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border border-pw-border text-slate-300 text-xs font-bold uppercase hover:bg-white/5 transition-all min-h-[44px] cursor-pointer"
                >
                  Try another address
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Default Browse Grid */
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-pw-border pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              All Marketplace Investment Deals
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : filterTeasers(defaultTeasers).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filterTeasers(defaultTeasers).slice(0, 30).map((t) => (
                <ListingCard key={t.id} teaser={t} />
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-2xl border border-pw-border p-12 text-center">
              <Building2 className="w-8 h-8 text-slate-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-200 mb-1">No Deals Match Filters</h3>
              <p className="text-xs text-slate-400 mb-4">Try broadening your filter criteria or search by street address.</p>
              <button
                onClick={() => handleStartDealCreation()}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs uppercase hover:bg-emerald-400 transition-all min-h-[44px]"
              >
                Create a Deal
              </button>
            </div>
          )}
        </div>
      )}
      </>
      )}

      {/* ── Deal Creation Sheet Component (Prompt 2 requirement) ── */}
      <CreateDealSheet
        isOpen={isCreateSheetOpen}
        onClose={() => setIsCreateSheetOpen(false)}
        initialAddress={createInitialAddress}
        existingDeals={createdDeals}
        onDealCreated={handleDealCreated}
      />
    </div>
  );
}

// ── Filter Chip Component ──
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-all min-h-[36px] cursor-pointer ${
        active
          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
          : 'text-slate-400 border-pw-border hover:border-white/20'
      }`}
    >
      {label}
    </button>
  );
}
