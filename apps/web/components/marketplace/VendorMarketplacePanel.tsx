'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MarketplaceSubnav } from '@/components/marketplace/MarketplaceSubnav';
import { RatingDisplay } from '@/components/marketplace/RatingDisplay';
import VendorSideSheet, {
  type VendorSideSheetData,
} from '@/components/marketplace/VendorSideSheet';
import { VendorRequestModal } from '@/components/marketplace/VendorRequestModal';

type FilterCategory =
  | 'All'
  | 'Lenders'
  | 'Inspectors'
  | 'Attorneys'
  | 'Contractors'
  | 'Property Managers'
  | 'Agents';

type ActiveTab = 'vendors' | 'deals' | 'investors';

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

const CATEGORY_BADGE_STYLES: Record<string, string> = {
  Inspector: 'border-sky-400/20 bg-sky-400/10 text-sky-400',
  Lender: 'border-white/20 bg-white/10 text-white/70',
  Lawyer: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
  Attorney: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
  Contractor: 'border-orange-400/20 bg-orange-400/10 text-orange-400',
  'Property Manager': 'border-amber-400/20 bg-amber-400/10 text-amber-400',
  'Listing Agent': 'border-pink-400/20 bg-pink-400/10 text-pink-400',
  Agent: 'border-pink-400/20 bg-pink-400/10 text-pink-400',
};

interface ApiVendor {
  id?: string;
  uid?: string;
  companyName?: string;
  type?: string;
  bio?: string;
  specialties?: string[];
  licensingStates?: string[];
  serviceAreas?: string[];
  avgTurnaroundDays?: number;
  overallRating?: number;
  totalReviews?: number;
  availability?: string;
  feeRangeLabel?: string;
  verified?: boolean;
  insuranceVerified?: boolean;
}

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

interface DealCardData {
  id: string;
  propertyName: string;
  address: string;
  city: string;
  assetClass: string;
  projectedRoi?: number;
}

interface InvestorProfile {
  uid: string;
  displayName: string;
  publicBio?: string;
  location?: string;
  followerCount?: number;
  isVerified?: boolean;
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

function VendorCard({
  vendor,
  onRequestQuote,
  onViewProfile,
}: {
  vendor: DisplayVendor;
  onRequestQuote: (vendorId: string) => void;
  onViewProfile: (vendorId: string) => void;
}) {
  const badgeClass =
    CATEGORY_BADGE_STYLES[vendor.category] ?? 'border-white/10 bg-white/5 text-white/55';

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-200 hover:border-white/20 hover:shadow-[0_0_24px_rgba(253,255,252,0.04)]">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}
        >
          {vendor.category}
        </span>
        <RatingDisplay rating={vendor.rating} totalReviews={vendor.totalReviews} variant="compact" />
      </div>

      <div>
        <h3 className="text-base font-bold leading-snug text-[#fdfffc]">{vendor.companyName}</h3>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-white/40">
          <span className="material-symbols-outlined text-[14px]">location_on</span>
          {vendor.location}
        </p>
      </div>

      <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-white/55">{vendor.bio}</p>

      <div className="flex flex-wrap gap-1.5">
        {(vendor.specialties ?? []).slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] font-semibold text-white/55"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-auto flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onViewProfile(vendor.id)}
          className="flex-1 rounded-lg border border-white/20 px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/5"
        >
          View Profile
        </button>
        <button
          type="button"
          onClick={() => onRequestQuote(vendor.id)}
          className="flex-1 rounded-lg bg-[#fdfffc] px-3 py-2 text-xs font-bold text-[#0d0a0b] hover:bg-white/90"
        >
          Request Quote
        </button>
      </div>

      <p className="border-t border-white/5 pt-2 text-[10px] leading-relaxed text-white/35">
        PaperWorking does not vet vendors. You must verify credentials and references before engaging.
      </p>
    </div>
  );
}

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const cityParam = searchParams.get('city');
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<ActiveTab>(
    tabParam === 'investors' ? 'investors' : 'vendors',
  );
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('All');

  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);

  const [deals, setDeals] = useState<DealCardData[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [dealsError, setDealsError] = useState<string | null>(null);

  const [investors, setInvestors] = useState<InvestorProfile[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [loadingInvestors, setLoadingInvestors] = useState(false);

  const [selectedVendor, setSelectedVendor] = useState<ApiVendor | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [sideSheetVendor, setSideSheetVendor] = useState<VendorSideSheetData | null>(null);
  const [isSideSheetOpen, setIsSideSheetOpen] = useState(false);

  useEffect(() => {
    document.title = 'PaperWorking — Vendor Marketplace';
  }, []);

  useEffect(() => {
    if (tabParam === 'investors') setActiveTab('investors');
    else if (tabParam === 'deals') setActiveTab('deals');
    else if (!tabParam) setActiveTab((prev) => (prev === 'investors' ? 'vendors' : prev));
  }, [tabParam]);

  useEffect(() => {
    if (typeParam) setActiveFilter(mapTypeParamToCategory(typeParam));
    if (cityParam) {
      setSearchInput(cityParam);
      setSearchQuery(cityParam);
    }
  }, [typeParam, cityParam]);

  useEffect(() => {
    if (activeTab !== 'vendors') return;
    let cancelled = false;

    async function fetchVendors() {
      setLoadingVendors(true);
      try {
        const params = new URLSearchParams();
        const apiType = CATEGORY_TO_API_TYPE[activeFilter];
        if (apiType !== 'All') params.append('type', apiType);
        if (searchQuery.trim()) params.append('location', searchQuery.trim());

        const res = await fetch(`/api/vendors?${params.toString()}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!cancelled && res.ok) {
          const data = (await res.json()) as { vendors?: ApiVendor[] };
          setVendors(data.vendors ?? []);
        }
      } catch (err) {
        console.error('Vendor fetch error', err);
      } finally {
        if (!cancelled) setLoadingVendors(false);
      }
    }

    fetchVendors();
    return () => {
      cancelled = true;
    };
  }, [activeFilter, searchQuery, activeTab]);

  useEffect(() => {
    if (activeTab !== 'deals') return;
    let cancelled = false;

    async function fetchDeals() {
      setLoadingDeals(true);
      setDealsError(null);
      try {
        const res = await fetch('/api/deals?tab=discover', {
          credentials: 'include',
          cache: 'no-store',
        });
        const body = (await res.json()) as { deals?: DealCardData[]; error?: string };
        if (!res.ok) throw new Error(body.error ?? 'Failed to load deals');
        if (!cancelled) setDeals(body.deals ?? []);
      } catch (err) {
        if (!cancelled) {
          setDealsError(err instanceof Error ? err.message : 'Unable to load active deals.');
        }
      } finally {
        if (!cancelled) setLoadingDeals(false);
      }
    }

    fetchDeals();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'investors') return;
    let cancelled = false;

    async function fetchInvestors() {
      setLoadingInvestors(true);
      try {
        const res = await fetch('/api/marketplace/investors', {
          credentials: 'include',
          cache: 'no-store',
        });
        const body = (await res.json()) as {
          profiles?: InvestorProfile[];
          following?: string[];
          error?: string;
        };
        if (!res.ok) throw new Error(body.error ?? 'Failed to load investors');
        if (!cancelled) {
          setInvestors(body.profiles ?? []);
          setFollowing(body.following ?? []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoadingInvestors(false);
      }
    }

    fetchInvestors();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const displayVendors = useMemo(() => {
    let source: DisplayVendor[] = vendors.map((v) => ({
      id: v.id ?? v.uid ?? String(Math.random()),
      companyName: v.companyName ?? 'Unknown',
      category: (v.type as string) ?? 'Other',
      location: (v.licensingStates ?? []).slice(0, 1).join(', ') || 'N/A',
      rating: v.overallRating ?? 0,
      totalReviews: v.totalReviews ?? 0,
      bio: v.bio ?? '',
      specialties: v.specialties ?? [],
    }));

    if (activeFilter !== 'All') {
      const apiType = CATEGORY_TO_API_TYPE[activeFilter];
      source = source.filter((v) => {
        const cat = v.category?.toLowerCase();
        return (
          cat === apiType.toLowerCase() ||
          (apiType === 'Lawyer' && (cat === 'attorney' || cat === 'lawyer')) ||
          (apiType === 'Listing Agent' && (cat === 'agent' || cat === 'listing agent'))
        );
      });
    }

    source.sort((a, b) => {
      const aHas = (a.rating || 0) > 0 && (a.totalReviews || 0) > 0;
      const bHas = (b.rating || 0) > 0 && (b.totalReviews || 0) > 0;
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      if (aHas && bHas) return (b.rating || 0) - (a.rating || 0);
      return a.companyName.localeCompare(b.companyName);
    });

    return source;
  }, [vendors, activeFilter]);

  const handleViewProfile = useCallback(
    (vendorId: string) => {
      const apiVendor = vendors.find((v) => (v.id ?? v.uid) === vendorId);
      if (!apiVendor) return;
      setSideSheetVendor({
        uid: apiVendor.uid ?? apiVendor.id ?? vendorId,
        companyName: apiVendor.companyName ?? 'Unknown',
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
    },
    [vendors],
  );

  const handleRequestQuote = useCallback(
    (vendorId: string) => {
      const apiVendor = vendors.find((v) => (v.id ?? v.uid) === vendorId);
      if (!apiVendor) return;
      setSelectedVendor(apiVendor);
      setIsQuoteModalOpen(true);
    },
    [vendors],
  );

  const toggleFollow = useCallback(
    async (targetUid: string) => {
      const isFollowing = following.includes(targetUid);
      const response = await fetch('/api/marketplace/investors/follow', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUid, follow: !isFollowing }),
      });
      if (!response.ok) return;
      setFollowing((current) =>
        isFollowing ? current.filter((uid) => uid !== targetUid) : [...current, targetUid],
      );
    },
    [following],
  );

  const title =
    activeTab === 'vendors'
      ? 'Vendor Marketplace'
      : activeTab === 'deals'
        ? 'Deal Marketplace'
        : 'Investor Directory';

  const subtitle =
    activeTab === 'vendors'
      ? 'Find trusted service providers for your real estate portfolio'
      : activeTab === 'deals'
        ? 'Browse active deal opportunities across the network'
        : 'Discover and follow public investor profiles';

  return (
    <div className="mx-auto min-h-full max-w-[1400px] space-y-6 px-5 py-6 lg:px-8 lg:py-7">
      <MarketplaceSubnav />

      <div className="flex flex-col gap-4 border-b border-white/5 pb-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-[#fdfffc] md:text-4xl">{title}</h1>
          <p className="text-sm text-white/55">{subtitle}</p>
        </div>

        <div className="flex self-start rounded-lg border border-white/10 bg-white/5 p-0.5 md:self-center">
          {(
            [
              { id: 'vendors' as const, label: 'Service Providers' },
              { id: 'deals' as const, label: 'Active Deals' },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setActiveTab(option.id)}
              className={`rounded-md px-4 py-1.5 text-xs font-bold transition-all ${
                activeTab === option.id
                  ? 'bg-[#fdfffc] text-[#0d0a0b] shadow'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'deals' ? (
        <div className="space-y-4">
          {loadingDeals ? (
            <div className="flex h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#121014]/50">
              <span className="material-symbols-outlined animate-spin text-2xl text-white/50">
                progress_activity
              </span>
              <span className="text-xs font-medium text-white/45">Fetching active deal listings…</span>
            </div>
          ) : dealsError ? (
            <div className="flex h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-red-500/20 px-4 text-center">
              <span className="material-symbols-outlined text-3xl text-red-400">error</span>
              <p className="text-sm font-bold text-[#fdfffc]">Unable to Load Deals</p>
              <p className="max-w-sm text-xs text-white/55">{dealsError}</p>
            </div>
          ) : deals.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/55">
              No published deals right now.{' '}
              <Link href="/dashboard/deals" className="text-[#fdfffc] underline-offset-4 hover:underline">
                Open Deals Marketplace
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {deals.map((deal) => (
                <Link
                  key={deal.id}
                  href={`/dashboard/deals/${deal.id}`}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20"
                >
                  <p className="text-[11px] uppercase tracking-[0.07em] text-white/45">
                    {deal.assetClass}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-[#fdfffc]">{deal.propertyName}</h3>
                  <p className="mt-1 text-sm text-white/55">{deal.address || deal.city}</p>
                  {deal.projectedRoi != null ? (
                    <p className="mt-3 text-sm text-emerald-300">ROI {deal.projectedRoi}%</p>
                  ) : null}
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'investors' ? (
        <div className="space-y-4">
          {loadingInvestors ? (
            <div className="flex items-center justify-center gap-3 py-24 text-white/45">
              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
              <span className="text-sm">Loading investors…</span>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {investors.map((profile) => (
                <article
                  key={profile.uid}
                  className="rounded-2xl border border-white/8 bg-white/[0.02] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-semibold text-[#fdfffc]">
                        {profile.displayName}
                        {profile.isVerified ? (
                          <span className="ml-2 text-xs text-white/45">Verified</span>
                        ) : null}
                      </h4>
                      <p className="mt-1 text-sm text-white/60">{profile.location}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleFollow(profile.uid)}
                      className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 hover:bg-white/5"
                    >
                      {following.includes(profile.uid) ? 'Following' : 'Follow'}
                    </button>
                  </div>
                  {profile.publicBio ? (
                    <p className="mt-3 text-sm text-white/70">{profile.publicBio}</p>
                  ) : null}
                  <Link
                    href={`/dashboard/marketplace/investors/${profile.uid}`}
                    className="mt-4 inline-flex text-sm text-white/75 underline-offset-4 hover:underline"
                  >
                    View profile
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex gap-0">
            <div className="relative flex-1">
              <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-white/35">
                location_on
              </span>
              <input
                type="text"
                placeholder="Search by City or Zip Code…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setSearchQuery(searchInput)}
                className="w-full border border-r-0 border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-[#fdfffc] outline-none placeholder:text-white/35 focus:border-white/25"
                style={{ borderRadius: '0.5rem 0 0 0.5rem' }}
              />
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery(searchInput)}
              className="bg-[#fdfffc] px-6 py-3.5 text-sm font-bold text-[#0d0a0b] hover:bg-white/90"
              style={{ borderRadius: '0 0.5rem 0.5rem 0' }}
            >
              Find Vendors
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTER_PILLS.map((pill) => {
              const isActive = activeFilter === pill;
              return (
                <button
                  key={pill}
                  type="button"
                  onClick={() => setActiveFilter(pill)}
                  className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-all ${
                    isActive
                      ? 'border-[#fdfffc]/40 bg-[#fdfffc]/10 text-[#fdfffc]'
                      : 'border-white/10 bg-transparent text-white/55 hover:border-white/30 hover:text-[#fdfffc]'
                  }`}
                >
                  {pill}
                </button>
              );
            })}
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <span className="material-symbols-outlined mt-0.5 flex-shrink-0 text-[18px] text-amber-500">
              warning
            </span>
            <p className="text-xs leading-relaxed text-amber-400/80">
              <span className="font-bold text-amber-400">Disclaimer: </span>
              PaperWorking does not vet vendors. You must verify credentials and references before
              engaging.
            </p>
          </div>

          {loadingVendors ? (
            <div className="flex items-center justify-center gap-3 py-24 text-white/45">
              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
              <span className="text-sm">Loading vendors…</span>
            </div>
          ) : vendors.length === 0 ? (
            <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 py-24 text-center">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/55">
                <span className="material-symbols-outlined text-[24px]">search</span>
              </div>
              <h3 className="text-lg font-bold leading-snug text-[#fdfffc]">No Registered Vendors</h3>
              <p className="text-xs leading-relaxed text-white/55">
                There are currently no active service providers registered in the PaperWorking
                Marketplace.
              </p>
            </div>
          ) : displayVendors.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-white/45">
              <span className="material-symbols-outlined text-[32px] opacity-30">search</span>
              <p className="text-sm">No vendors found for the selected filters.</p>
              <button
                type="button"
                onClick={() => {
                  setActiveFilter('All');
                  setSearchQuery('');
                  setSearchInput('');
                }}
                className="text-xs text-[#fdfffc] hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
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

      <VendorRequestModal
        isOpen={isQuoteModalOpen}
        vendor={
          selectedVendor
            ? {
                id: selectedVendor.id ?? selectedVendor.uid ?? '',
                companyName: selectedVendor.companyName ?? 'Unknown',
                type: selectedVendor.type,
              }
            : null
        }
        onClose={() => {
          setIsQuoteModalOpen(false);
          setSelectedVendor(null);
        }}
      />

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
          setSelectedVendor({
            id: v.uid,
            uid: v.uid,
            companyName: v.companyName,
            type: v.type,
          });
          setIsQuoteModalOpen(true);
        }}
      />

      <div className="border-t border-white/10 pt-6">
        <p className="font-mono text-xs leading-relaxed text-white/35">
          PaperWorking facilitates introductions and interest tracking only. No funds, securities, or
          ownership interests are offered, sold, or transferred through the platform. All transactions
          occur outside PaperWorking, directly between the parties.
        </p>
      </div>
    </div>
  );
}

export default function VendorMarketplacePanel() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/20 border-t-[#fdfffc]" />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/45">
              Loading Marketplace…
            </p>
          </div>
        </div>
      }
    >
      <MarketplaceContent />
    </Suspense>
  );
}
