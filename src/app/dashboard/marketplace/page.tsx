'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  MapPin,
  Star,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useAuth } from '@/context/AuthContext';
import { isSubscriptionActive } from '@/lib/stripe/subscription';
import { projectsService } from '@/lib/firebase/deals';
import { deriveAllMetrics, computeIRR, buildIRRCashFlows } from '@/lib/metrics/reiMetrics';
import { VendorRequestModal } from '@/components/marketplace/VendorRequestModal';
import VendorSideSheet, { type VendorSideSheetData } from '@/components/marketplace/VendorSideSheet';
import { VendorProfile } from '@/types/schema';
import type { DealListingTeaser } from '@/types/listing';
import { getPublishedListings } from '@/actions/listings';
import DealMap from '@/components/marketplace/DealMap';
import { RatingDisplay } from '@/components/marketplace/RatingDisplay';

/* ═══════════════════════════════════════════════════════════════
   Vendor Marketplace — Stitch design: 3e7255323f7b493089506b6ecbf6cbf8
   ═══════════════════════════════════════════════════════════════ */

type FilterCategory = 'All' | 'Lenders' | 'Inspectors' | 'Attorneys' | 'Contractors' | 'Property Managers' | 'Agents';

const FILTER_PILLS: FilterCategory[] = [
  'All',
  'Lenders',
  'Inspectors',
  'Attorneys',
  'Contractors',
  'Property Managers',
  'Agents',
];

const CATEGORY_TO_API_TYPE: Record<FilterCategory, string> = {
  All: 'All',
  Lenders: 'Lender',
  Inspectors: 'Inspector',
  Attorneys: 'Lawyer',
  Contractors: 'Contractor',
  'Property Managers': 'Property Manager',
  Agents: 'Listing Agent',
};

interface DisplayVendor {
  id: string;
  companyName: string;
  category: string;
  location: string;
  rating: number;
  totalReviews: number;
  bio: string;
  specialties: string[];
}

const CATEGORY_BADGE_STYLES: Record<string, string> = {
  Inspector:        'bg-sky-400/10 border-sky-400/20 text-sky-400',
  Lender:           'bg-[#6E7480]/10 border-[#6E7480]/20 text-[#6E7480]',
  Attorney:         'bg-slate-400/10 border-slate-400/20 text-[#9E9DA0]',
  Contractor:       'bg-orange-400/10 border-orange-400/20 text-orange-400',
  'Property Manager': 'bg-amber-400/10 border-amber-400/20 text-amber-400',
  Agent:            'bg-pink-400/10 border-pink-400/20 text-pink-400',
};

function VendorCard({
  vendor,
  onRequestQuote,
  onViewProfile,
}: {
  vendor: DisplayVendor;
  onRequestQuote: (v: any) => void;
  onViewProfile: (vendorId: string) => void;
}) {
  const badgeClass = CATEGORY_BADGE_STYLES[vendor.category] ?? 'bg-white/5 border-white/10 text-[#9E9DA0]';

  return (
    <div
      className="glass-card rounded-xl border border-pw-border flex flex-col gap-4 p-5 transition-all duration-200 hover:border-[#454955]/30 hover:shadow-[0_0_24px_rgba(69,73,85,0.06)]"
    >
      {/* Top row: category badge */}
      <div className="flex items-center justify-between">
        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
          {vendor.category}
        </span>
        <RatingDisplay rating={vendor.rating} totalReviews={vendor.totalReviews} variant="compact" />
      </div>

      {/* Name */}
      <div>
        <h3 className="text-base font-bold text-white leading-snug">{vendor.companyName}</h3>
        <p className="flex items-center gap-1 text-xs text-[#6B6870] mt-0.5">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          {vendor.location}
        </p>
      </div>

      {/* Description */}
      <p className="text-sm text-[#9E9DA0] leading-relaxed line-clamp-2 flex-1">{vendor.bio}</p>

      {/* Specialty tags */}
      <div className="flex flex-wrap gap-1.5">
        {(vendor.specialties ?? []).slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded text-[10px] font-semibold text-[#9E9DA0] border border-white/[0.06] bg-white/[0.03]"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        <button
          type="button"
          onClick={() => onViewProfile(vendor.id)}
          className="flex-1 px-3 py-2 rounded-lg border border-[#454955]/40 text-[#454955] text-xs font-bold hover:border-[#454955] hover:bg-[#454955]/5 transition-all"
        >
          View Profile
        </button>
        <button
          type="button"
          onClick={() => onRequestQuote(vendor)}
          className="flex-1 px-3 py-2 rounded-lg bg-[#454955] text-black text-xs font-bold hover:bg-[#454955]/90 transition-all"
        >
          Request Quote
        </button>
      </div>

      {/* Vetting Disclaimer */}
      <p className="text-[10px] text-[#6B6870] border-t border-white/5 pt-2 leading-relaxed">
        PaperWorking does not vet vendors. You must verify credentials and references before engaging.
      </p>
    </div>
  );
}

function mapTypeParamToCategory(type: string | null): FilterCategory {
  if (!type) return 'All';
  const t = type.toLowerCase();
  if (t === 'lender') return 'Lenders';
  if (t === 'inspector') return 'Inspectors';
  if (t === 'lawyer' || t === 'attorney') return 'Attorneys';
  if (t === 'contractor') return 'Contractors';
  if (t === 'property manager') return 'Property Managers';
  if (t === 'listing agent' || t === 'agent') return 'Agents';
  return 'All';
}

function MarketplaceContent() {
  /* ── Preserved Firestore / data hooks ── */
  useAllDealsSync();

  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const projectIdParam = searchParams.get('projectId');
  const cityParam = searchParams.get('city');

  const { profile, user } = useAuth();
  const projects = useProjectStore((state) => state.projects);
  const hasActiveSub = isSubscriptionActive(profile);

  /* ── Search & filter state ── */
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('All');

  // Sync state from query parameters on mount or when parameters change
  useEffect(() => {
    if (typeParam) {
      setActiveFilter(mapTypeParamToCategory(typeParam));
    }
    if (cityParam) {
      setSearchInput(cityParam);
      setSearchQuery(cityParam);
    }
  }, [typeParam, cityParam]);

  /* ── Vendor data state (preserved from original) ── */
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);

  /* ── Quote modal state (preserved from original) ── */
  const [selectedVendor, setSelectedVendor] = useState<VendorProfile | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  /* ── Side sheet state ── */
  const [sideSheetVendor, setSideSheetVendor] = useState<VendorSideSheetData | null>(null);
  const [isSideSheetOpen, setIsSideSheetOpen] = useState(false);

  /* ── Tab View & Deals state (UX-11) ── */
  const [activeTab, setActiveTab] = useState<'vendors' | 'deals'>('vendors');
  const [deals, setDeals] = useState<DealListingTeaser[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [dealsError, setDealsError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== 'deals') return;
    
    const fetchDeals = async () => {
      setLoadingDeals(true);
      setDealsError(null);
      try {
        const data = await getPublishedListings();
        setDeals(data);
      } catch (err) {
        console.error('Failed to fetch published deals:', err);
        setDealsError('Unable to load active deals. Please try again.');
      } finally {
        setLoadingDeals(false);
      }
    };

    fetchDeals();
  }, [activeTab]);

  /* ── Fetch vendors from API (preserved from original) ── */
  useEffect(() => {
    const fetchVendors = async () => {
      setLoadingVendors(true);
      try {
        const params = new URLSearchParams();
        const apiType = CATEGORY_TO_API_TYPE[activeFilter];
        if (apiType !== 'All') params.append('type', apiType);
        if (searchQuery.trim()) params.append('zip', searchQuery.trim());

        const res = await fetch(`/api/vendors?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setVendors(data.vendors ?? []);
        }
      } catch (err) {
        console.error('Vendor fetch error', err);
      } finally {
        setLoadingVendors(false);
      }
    };

    fetchVendors();
  }, [activeFilter, searchQuery]);

  /* ── Derive display list: API results ── */
  const displayVendors = useMemo(() => {
    let source = vendors.map((v) => ({
      id: v.id ?? String(Math.random()),
      companyName: v.companyName ?? 'Unknown',
      category: (v.type as string) ?? 'Other',
      location: (v.licensingStates ?? []).slice(0, 1).join(', ') || 'N/A',
      rating: v.overallRating ?? 0,
      totalReviews: v.totalReviews ?? 0,
      bio: v.bio ?? '',
      specialties: v.specialties ?? [],
    }));

    /* client-side filter on category pill */
    if (activeFilter !== 'All') {
      const apiType = CATEGORY_TO_API_TYPE[activeFilter];
      source = source.filter((v) => {
        const cat = v.category?.toLowerCase();
        return (
          cat === apiType.toLowerCase() ||
          /* handle attorney/lawyer alias */
          (apiType === 'Lawyer' && (cat === 'attorney' || cat === 'lawyer')) ||
          /* handle listing agent alias */
          (apiType === 'Listing Agent' && (cat === 'agent' || cat === 'listing agent'))
        );
      });
    }

    /* Sort vendors: show rated vendors first (by rating desc), then unrated/new vendors at the bottom. */
    source.sort((a, b) => {
      const aHasReviews = (a.rating || 0) > 0 && (a.totalReviews || 0) > 0;
      const bHasReviews = (b.rating || 0) > 0 && (b.totalReviews || 0) > 0;

      if (aHasReviews && !bHasReviews) return -1;
      if (!aHasReviews && bHasReviews) return 1;

      if (aHasReviews && bHasReviews) {
        return (b.rating || 0) - (a.rating || 0);
      }

      return a.companyName.localeCompare(b.companyName);
    });

    return source;
  }, [vendors, activeFilter]);

  const handleRequestQuote = (vendor: any) => {
    setSelectedVendor(vendor as VendorProfile);
    setIsQuoteModalOpen(true);
  };

  const handleViewProfile = (vendorId: string) => {
    const apiVendor = vendors.find(v => v.id === vendorId);
    if (apiVendor) {
      setSideSheetVendor({
        uid: apiVendor.uid ?? apiVendor.id,
        companyName: apiVendor.companyName,
        type: apiVendor.type ?? 'Other',
        bio: apiVendor.bio ?? '',
        specialties: apiVendor.specialties ?? [],
        licensingStates: apiVendor.licensingStates ?? [],
        serviceAreas: apiVendor.serviceAreas,
        avgTurnaroundDays: apiVendor.avgTurnaroundDays ?? 3,
        overallRating: apiVendor.overallRating ?? 0,
        totalReviews: apiVendor.totalReviews ?? 0,
        availability: apiVendor.availability ?? 'Available',
        feeRangeLabel: apiVendor.feeRangeLabel ?? 'Contact for pricing',
        verified: apiVendor.verified ?? false,
        insuranceVerified: apiVendor.insuranceVerified ?? false,
      });
      setIsSideSheetOpen(true);
    }
  };

  const handleFindVendors = () => {
    setSearchQuery(searchInput);
  };

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 space-y-6">
      {/* ── Page Header & View Toggle ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/5 pb-5">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            {activeTab === 'vendors' ? 'Vendor Marketplace' : 'Deal Marketplace'}
          </h1>
          <p className="text-[#9E9DA0] text-sm">
            {activeTab === 'vendors'
              ? 'Find trusted service providers for your real estate portfolio'
              : 'Browse active deal density across the United States'}
          </p>
        </div>

        {/* Tab view selection buttons */}
        <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5 self-start md:self-center">
          <button
            type="button"
            onClick={() => setActiveTab('vendors')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'vendors'
                ? 'bg-[#454955] text-black shadow'
                : 'text-[#9E9DA0] hover:text-white'
            }`}
          >
            Service Providers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('deals')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'deals'
                ? 'bg-[#454955] text-black shadow'
                : 'text-[#9E9DA0] hover:text-white'
            }`}
          >
            Active Deals Map
          </button>
        </div>
      </div>

      {activeTab === 'deals' ? (
        /* ── Deal Heatmap View ── */
        <div className="space-y-6">
          {loadingDeals ? (
            <div className="w-full h-[500px] glass-card border border-pw-border rounded-2xl flex flex-col items-center justify-center gap-3 bg-[#121014]/50">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
              <span className="text-xs text-[var(--color-muted)] font-medium">Fetching active deal listings...</span>
            </div>
          ) : dealsError ? (
            <div className="w-full h-[500px] glass-card border border-red-500/20 rounded-2xl flex flex-col items-center justify-center gap-3 text-center px-4">
              <span className="material-symbols-outlined text-3xl text-red-400">error</span>
              <p className="text-sm font-bold text-[var(--color-on-surface)]">Unable to Load Deals</p>
              <p className="text-xs text-[var(--color-muted)] max-w-sm">{dealsError}</p>
              <button
                type="button"
                onClick={() => setActiveTab('deals')}
                className="mt-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-[0.05em] bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/25 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <DealMap deals={deals} />
          )}
        </div>
      ) : (
        /* ── Service Providers View ── */
        <>
          {/* ── Search Bar ── */}
          <div className="flex gap-0">
            <div className="relative flex-1">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6870] pointer-events-none" />
              <input
                type="text"
                placeholder="Search by City or Zip Code..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFindVendors()}
                className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 border-r-0 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-[#454955]/55 transition-colors"
                style={{ borderRadius: '0.5rem 0 0 0.5rem' }}
              />
            </div>
            <button
              type="button"
              onClick={handleFindVendors}
              className="pw-interactive px-6 py-3.5 bg-[#454955] text-black text-sm font-bold hover:bg-[#454955]/90 transition-colors"
              style={{ borderRadius: '0 0.5rem 0.5rem 0' }}
            >
              Find Vendors
            </button>
          </div>

          {/* ── Filter Pills ── */}
          <div className="flex flex-wrap gap-2">
            {FILTER_PILLS.map((pill) => {
              const isActive = activeFilter === pill;
              return (
                <button
                  key={pill}
                  type="button"
                  onClick={() => setActiveFilter(pill)}
                  className={`px-4 py-1.5 rounded-full border text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[#454955]/10 border-[#454955] text-[#454955]'
                      : 'border-white/10 text-[#9E9DA0] hover:border-[#454955]/40 hover:text-[#454955] bg-transparent'
                  }`}
                >
                  {pill}
                </button>
              );
            })}
          </div>

          {/* ── Disclaimer Banner ── */}
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-400/80 leading-relaxed">
              <span className="font-bold text-amber-400">Disclaimer: </span>
              PaperWorking does not vet vendors. You must verify credentials and references before engaging.
            </p>
          </div>

          {/* ── Vendor Grid ── */}
          {loadingVendors ? (
            <div className="flex justify-center items-center py-24 gap-3 text-[#6B6870]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading vendors...</span>
            </div>
          ) : vendors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#9E9DA0] mb-2">
                <Search className="w-6 h-6 opacity-60" />
              </div>
              <h3 className="text-lg font-bold text-white leading-snug">No Registered Vendors</h3>
              <p className="text-xs text-[#9E9DA0] leading-relaxed">
                There are currently no active service providers registered in the PaperWorking Marketplace. Once providers complete onboarding and their active status is verified, they will appear here.
              </p>
            </div>
          ) : displayVendors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#6B6870]">
              <Search className="w-8 h-8 opacity-30" />
              <p className="text-sm">No vendors found for the selected filters.</p>
              <button
                type="button"
                onClick={() => { setActiveFilter('All'); setSearchQuery(''); setSearchInput(''); }}
                className="text-xs text-[#454955] hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayVendors.map((vendor) => (
                <VendorCard
                  key={vendor.id}
                  vendor={vendor}
                  onRequestQuote={handleRequestQuote}
                  onViewProfile={handleViewProfile}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Quote Modal (preserved from original) ── */}
      <VendorRequestModal
        isOpen={isQuoteModalOpen}
        vendor={selectedVendor}
        projectId={projectIdParam || undefined}
        onClose={() => {
          setIsQuoteModalOpen(false);
          setSelectedVendor(null);
        }}
      />

      {/* ── Side Sheet for quick vendor preview ── */}
      <VendorSideSheet
        vendor={sideSheetVendor}
        open={isSideSheetOpen}
        onClose={() => {
          setIsSideSheetOpen(false);
          setSideSheetVendor(null);
        }}
        onRequestQuote={(v) => {
          setIsSideSheetOpen(false);
          setSideSheetVendor(null);
          // Convert VendorSideSheetData to VendorProfile shape for the modal
          setSelectedVendor({
            id: v.uid,
            uid: v.uid,
            companyName: v.companyName,
            type: v.type as any,
            bio: v.bio,
            specialties: v.specialties,
            licensingStates: v.licensingStates,
            serviceAreas: v.serviceAreas,
            avgTurnaroundDays: v.avgTurnaroundDays,
            overallRating: v.overallRating,
            totalReviews: v.totalReviews,
            availability: v.availability as any,
            feeRangeLabel: v.feeRangeLabel,
            verified: v.verified,
            insuranceVerified: v.insuranceVerified,
          });
          setIsQuoteModalOpen(true);
        }}
      />
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0d0a0b]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 rounded-full animate-spin border-[#454955] border-t-transparent" />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E9DA0]">
            Loading Marketplace…
          </p>
        </div>
      </div>
    }>
      <MarketplaceContent />
    </Suspense>
  );
}
