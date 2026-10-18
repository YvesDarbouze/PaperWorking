'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MapPin, CircleNotch, WarningCircle, Warning, MagnifyingGlass, PlusCircle, Storefront, X } from '@phosphor-icons/react';
import { MarketplaceSubnav } from '@/components/marketplace/MarketplaceSubnav';
import { RatingDisplay } from '@/components/marketplace/RatingDisplay';
import VendorSideSheet, {
  type VendorSideSheetData,
} from '@/components/marketplace/VendorSideSheet';
import { VendorRequestModal } from '@/components/marketplace/VendorRequestModal';
import MarketplaceSocialProfileCard from '@/components/marketplace/MarketplaceSocialProfileCard';
import { bffFetch } from '@/lib/api/bff-fetch';
import { useOptionalAuth } from '@/context/AuthContext';

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
  vendorSkills?: string[];
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
  vendorSkills?: string[];
}

interface DealCardData {
  id: string;
  slug?: string;
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
    <div className="flex flex-col gap-4 rounded-none border border-neutral-800 bg-neutral-900/40 p-5 transition-all duration-200 hover:border-neutral-700">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`rounded-none border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badgeClass}`}
        >
          {vendor.category}
        </span>
        <RatingDisplay rating={vendor.rating} totalReviews={vendor.totalReviews} variant="compact" />
      </div>

      <div className="min-w-0">
        <h3 className="break-words text-base font-semibold leading-snug text-white">{vendor.companyName}</h3>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-400">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
          <span className="break-words">{vendor.location}</span>
        </p>
      </div>

      <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-neutral-400">{vendor.bio}</p>

      <div className="flex flex-wrap gap-1.5">
        {(vendor.specialties ?? []).slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-none border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[10px] font-medium text-neutral-300"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-auto flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onViewProfile(vendor.id)}
          className="flex-1 rounded-none border border-neutral-700 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 min-h-[44px] transition"
        >
          View Profile
        </button>
        <button
          type="button"
          onClick={() => onRequestQuote(vendor.id)}
          className="flex-1 rounded-none bg-white px-3 py-2 text-xs font-medium text-neutral-950 hover:bg-neutral-200 min-h-[44px] transition"
        >
          Request Quote
        </button>
      </div>

      <p className="border-t border-neutral-800 pt-2 text-[10px] leading-relaxed text-neutral-500">
        PaperWorking does not vet vendors. You must verify credentials and references before engaging.
      </p>
    </div>
  );
}

function MarketplaceContent({ initialSearchInput = '' }: { initialSearchInput?: string }) {
  const auth = useOptionalAuth();
  const isAuthed = auth ? (auth.authenticated && !auth.loading) : true;
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const cityParam = searchParams.get('city');
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<ActiveTab>(
    tabParam === 'investors' ? 'investors' : 'vendors',
  );
  const [searchInput, setSearchInput] = useState(cityParam || initialSearchInput || '');
  const [searchQuery, setSearchQuery] = useState(cityParam || initialSearchInput || '');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('All');

  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);

  const [deals, setDeals] = useState<DealCardData[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [dealsError, setDealsError] = useState<string | null>(null);

  const [listings, setListings] = useState<
    Array<{
      id: string;
      title: string;
      vendorType: string;
      city: string;
      budgetRange: string;
      responseTime: string;
      isNewListing?: boolean;
    }>
  >([]);
  const [listingsCount, setListingsCount] = useState(0);

  const [investors, setInvestors] = useState<InvestorProfile[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [loadingInvestors, setLoadingInvestors] = useState(false);

  const [selectedVendor, setSelectedVendor] = useState<ApiVendor | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [sideSheetVendor, setSideSheetVendor] = useState<VendorSideSheetData | null>(null);
  const [isSideSheetOpen, setIsSideSheetOpen] = useState(false);

  const [userVendorSkills, setUserVendorSkills] = useState<string[] | null>(null);
  const [isSkillsGateOpen, setIsSkillsGateOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadUserSkills() {
      try {
        let skills: string[] | null = null;
        const res = await fetch('/api/marketplace/profile', {
          cache: 'no-store',
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.profile?.vendorSkills) && data.profile.vendorSkills.length > 0) {
            skills = data.profile.vendorSkills;
          }
        }
        if (!skills) {
          const sRes = await fetch('/api/settings/profile', {
            cache: 'no-store',
            credentials: 'include',
          });
          if (sRes.ok) {
            const sData = await sRes.json();
            if (Array.isArray(sData.vendorSkills) && sData.vendorSkills.length > 0) {
              skills = sData.vendorSkills;
            }
          }
        }
        if (!skills && typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('pw_settings_vendor_skills');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                skills = parsed.filter((s): s is string => typeof s === 'string');
              }
            }
          } catch {
            // ignore
          }
        }
        if (isMounted) {
          setUserVendorSkills(skills ?? []);
        }
      } catch {
        if (isMounted) setUserVendorSkills([]);
      }
    }
    if (isAuthed) {
      loadUserSkills();
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthed]);

  useEffect(() => {
    document.title = 'PaperWorking · Vendor Directory';
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
    if (activeTab !== 'vendors' || !isAuthed) return;
    let cancelled = false;

    async function fetchVendors() {
      setLoadingVendors(true);
      try {
        const params = new URLSearchParams();
        const apiType = CATEGORY_TO_API_TYPE[activeFilter];
        if (apiType !== 'All') params.append('type', apiType);
        if (searchQuery.trim()) params.append('location', searchQuery.trim());

        const [vendorsRes, listingsRes] = await Promise.all([
          bffFetch(`/api/vendors?${params.toString()}`, {
            cache: 'no-store',
          }),
          bffFetch('/api/marketplace/listings', {
            cache: 'no-store',
          }),
        ]);

        if (!cancelled && vendorsRes.ok) {
          const data = (await vendorsRes.json()) as { vendors?: ApiVendor[] };
          setVendors(data.vendors ?? []);
        }

        if (!cancelled && listingsRes.ok) {
          const data = (await listingsRes.json()) as {
            listings?: Array<{
              id: string;
              title: string;
              vendorType: string;
              city: string;
              budgetRange: string;
              responseTime: string;
              isNewListing?: boolean;
            }>;
            count?: number;
          };
          setListings(data.listings ?? []);
          setListingsCount(data.count ?? data.listings?.length ?? 0);
        }
      } catch (err) {
        if (!isAuthed || (err instanceof Error && err.message.includes('Unauthorized'))) {
          // Handled by apiFetch redirect
        } else {
          console.error('Vendor fetch error', err);
        }
      } finally {
        if (!cancelled) setLoadingVendors(false);
      }
    }

    fetchVendors();
    return () => {
      cancelled = true;
    };
  }, [activeFilter, searchQuery, activeTab, isAuthed]);

  useEffect(() => {
    if (activeTab !== 'deals' || !isAuthed) return;
    let cancelled = false;

    async function fetchDeals() {
      setLoadingDeals(true);
      setDealsError(null);
      try {
        const res = await bffFetch('/api/deals?tab=discover', {
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
  }, [activeTab, isAuthed]);

  useEffect(() => {
    if (activeTab !== 'investors' || !isAuthed) return;
    let cancelled = false;

    async function fetchInvestors() {
      setLoadingInvestors(true);
      try {
        const res = await bffFetch('/api/marketplace/investors', {
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
  }, [activeTab, isAuthed]);

  const displayVendors = useMemo(() => {
    let source: DisplayVendor[] = vendors.map((v) => ({
      id: v.id ?? v.uid ?? String(Math.random()),
      companyName: v.companyName ?? 'Unknown',
      category: (v.type as string) ?? 'Other',
      location: (v.licensingStates ?? []).slice(0, 1).join(', ') || 'N/A',
      rating: v.overallRating ?? 0,
      totalReviews: v.totalReviews ?? 0,
      bio: v.bio ?? '',
      specialties: (v as any).vendorSkills ?? v.specialties ?? [],
      vendorSkills: (v as any).vendorSkills ?? v.specialties ?? [],
    }));

    if (activeFilter !== 'All') {
      const apiType = CATEGORY_TO_API_TYPE[activeFilter];
      source = source.filter((v) => {
        const cat = v.category?.toLowerCase();
        const specs = (v.specialties || []).map((s) => s.toLowerCase());
        return (
          cat === apiType.toLowerCase() ||
          (apiType === 'Lawyer' && (cat === 'attorney' || cat === 'lawyer' || specs.some((s) => s.includes('attorney') || s.includes('lawyer')))) ||
          (apiType === 'Listing Agent' && (cat === 'agent' || cat === 'listing agent' || specs.some((s) => s.includes('broker') || s.includes('agent')))) ||
          specs.some((s) => s.includes(apiType.toLowerCase()))
        );
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      source = source.filter((v) => {
        const name = v.companyName.toLowerCase();
        const cat = v.category.toLowerCase();
        const bio = v.bio.toLowerCase();
        const loc = v.location.toLowerCase();
        const specs = (v.specialties || []).map((s) => s.toLowerCase());
        return (
          name.includes(q) ||
          cat.includes(q) ||
          bio.includes(q) ||
          loc.includes(q) ||
          specs.some((s) => s.includes(q))
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
  }, [vendors, activeFilter, searchQuery]);

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
      const nextFollow = !isFollowing;
      const delta = nextFollow ? 1 : -1;

      // Optimistically update following list and target investor followerCount
      setFollowing((current) =>
        isFollowing ? current.filter((uid) => uid !== targetUid) : [...current, targetUid],
      );
      setInvestors((current) =>
        current.map((inv) =>
          inv.uid === targetUid
            ? { ...inv, followerCount: Math.max(0, (inv.followerCount ?? 0) + delta) }
            : inv,
        ),
      );

      try {
        const response = await bffFetch('/api/marketplace/investors/follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUid, follow: nextFollow }),
        });
        if (!response.ok) {
          throw new Error('Failed to update follow status');
        }
      } catch {
        // Roll back on server failure
        setFollowing((current) =>
          nextFollow ? current.filter((uid) => uid !== targetUid) : [...current, targetUid],
        );
        setInvestors((current) =>
          current.map((inv) =>
            inv.uid === targetUid
              ? { ...inv, followerCount: Math.max(0, (inv.followerCount ?? 0) - delta) }
              : inv,
          ),
        );
      }
    },
    [following],
  );

  const title =
    activeTab === 'vendors'
      ? 'Vendor Directory'
      : activeTab === 'deals'
        ? 'Deal Marketplace'
        : 'Investor Directory';

  const subtitle =
    activeTab === 'vendors'
      ? 'Find trusted service providers for your real estate portfolio'
      : activeTab === 'deals'
        ? 'Browse active deal opportunities across the network'
        : 'Discover and follow public investor profiles';

  const handleListServicesClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsSkillsGateOpen(true);
  };

  return (
    <div className="mx-auto min-h-full max-w-[1400px] space-y-6 px-5 py-6 lg:px-8 lg:py-7">
      <MarketplaceSubnav />

      <div className="flex flex-col gap-4 border-b border-white/5 pb-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-[#fdfffc] md:text-4xl">{title}</h1>
          <p className="text-sm text-white/55">{subtitle}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Link
            href="/dashboard/settings?section=general#vendor-skills"
            data-testid="list-services-vendor-directory-btn"
            onClick={handleListServicesClick}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-none bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-950 transition hover:bg-white"
          >
            <PlusCircle className="h-4 w-4" />
            <span>+ List Your Services</span>
          </Link>
          {userVendorSkills && userVendorSkills.length > 0 ? (
            <Link
              href="/dashboard/settings?section=general#vendor-skills"
              data-testid="manage-vendor-skills-settings-link"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-none border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-xs font-semibold text-neutral-200 transition hover:border-neutral-600 hover:bg-neutral-800"
            >
              <span>Manage Skills ({userVendorSkills.length}/3)</span>
            </Link>
          ) : null}

          <div className="flex self-start rounded-none border border-neutral-800 bg-neutral-900/50 p-0.5 md:self-center">
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
                className={`rounded-none px-4 py-1.5 text-xs font-medium transition-all min-h-[40px] ${
                  activeTab === option.id
                    ? 'bg-neutral-100 text-neutral-950 shadow'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Universal Directory Privileges Announcement */}
      <div
        data-testid="universal-vendor-directory-banner"
        className="flex items-center gap-2.5 rounded-none border border-neutral-800 bg-neutral-900/40 px-4 py-2.5 text-xs text-neutral-400"
      >
        <Storefront className="h-4 w-4 shrink-0 text-neutral-300" />
        <span>
          <strong className="text-neutral-200">Universal Directory Privileges:</strong> Investors, Investment Teams, and Vendors are all entitled to list trade and professional services on the Vendor Directory.
        </span>
      </div>

      {/* Investor Profile & Social Network Bar */}
      <MarketplaceSocialProfileCard
        variant="banner"
        contextLabel="Vendor Directory"
        followingCount={8 + following.length}
      />

      {activeTab === 'deals' ? (
        <div className="space-y-4">
          {loadingDeals ? (
            <div className="flex h-[320px] flex-col items-center justify-center gap-3 rounded-none border border-neutral-800 bg-neutral-950">
              <CircleNotch className="h-6 w-6 animate-spin text-neutral-400" />
              <span className="text-xs font-medium text-neutral-400">Fetching active deal listings…</span>
            </div>
          ) : dealsError ? (
            <div className="flex h-[320px] flex-col items-center justify-center gap-3 rounded-none border border-red-500/20 px-4 text-center">
              <WarningCircle className="h-8 w-8 text-red-400" />
              <p className="text-sm font-bold text-neutral-100">Unable to Load Deals</p>
              <p className="max-w-sm text-xs text-neutral-400">{dealsError}</p>
            </div>
          ) : deals.length === 0 ? (
            <div className="rounded-none border border-neutral-800 bg-neutral-900/40 p-8 text-center text-sm text-neutral-400">
              No published deals right now.{' '}
              <Link href="/dashboard/deals" className="text-neutral-100 underline-offset-4 hover:underline">
                Open Deals Marketplace
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {deals.map((deal) => (
                <Link
                  key={deal.id}
                  href={`/marketplace/${deal.slug || deal.id}`}
                  className="rounded-none border border-neutral-800 bg-neutral-900/40 p-5 transition hover:border-neutral-700"
                >
                  <p className="text-[11px] uppercase tracking-[0.07em] text-neutral-400">
                    {deal.assetClass}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-neutral-100">{deal.propertyName}</h3>
                  <p className="mt-1 text-sm text-neutral-400">{deal.address || deal.city}</p>
                  {deal.projectedRoi != null ? (
                    <p className="mt-3 text-sm text-neutral-200">ROI {deal.projectedRoi}%</p>
                  ) : null}
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'investors' ? (
        <div className="space-y-4">
          {loadingInvestors ? (
            <div className="flex items-center justify-center gap-3 py-24 text-neutral-400">
              <CircleNotch className="h-5 w-5 animate-spin text-neutral-400" />
              <span className="text-sm">Loading investors…</span>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {investors.map((profile) => {
                const isFollowingInvestor = following.includes(profile.uid);
                return (
                  <article
                    key={profile.uid}
                    className="rounded-none border border-neutral-800 bg-neutral-900/40 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="break-words text-lg font-semibold text-neutral-100">
                          {profile.displayName}
                          {profile.isVerified ? (
                            <span className="ml-2 text-xs text-neutral-400">Verified</span>
                          ) : null}
                        </h4>
                        <p className="mt-1 break-words text-sm text-neutral-400">{profile.location}</p>
                      </div>
                      <button
                        type="button"
                        data-testid={`follow-investor-btn-${profile.uid}`}
                        aria-pressed={isFollowingInvestor}
                        onClick={() => toggleFollow(profile.uid)}
                        className={`min-h-[36px] cursor-pointer rounded-none border px-3.5 py-1.5 text-xs transition ${
                          isFollowingInvestor
                            ? 'border-neutral-200 bg-neutral-100 font-semibold text-neutral-950 hover:bg-white'
                            : 'border-neutral-700 bg-neutral-900 font-medium text-neutral-200 hover:border-neutral-500 hover:bg-neutral-800'
                        }`}
                      >
                        {isFollowingInvestor ? 'Following' : 'Follow'}
                      </button>
                    </div>
                    {profile.publicBio ? (
                      <p className="mt-3 text-sm text-neutral-300">{profile.publicBio}</p>
                    ) : null}
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <Link
                        href={`/dashboard/marketplace/investors/${encodeURIComponent(profile.uid)}`}
                        data-testid={`view-investor-profile-link-${profile.uid}`}
                        className="inline-flex text-sm text-neutral-400 underline-offset-4 hover:underline"
                      >
                        View profile
                      </Link>
                      <span
                        data-testid={`investor-follower-count-${profile.uid}`}
                        className="font-mono text-xs tabular-nums text-neutral-400"
                      >
                        {profile.followerCount ?? 0} followers
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-0">
            <div className="relative w-full flex-1">
              <MapPin className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-neutral-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by City or Zip Code…"
                aria-label="Search vendors"
                data-testid="vendor-directory-search-input"
                value={searchInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchInput(val);
                  setSearchQuery(val);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSearchQuery(searchInput);
                  } else if (e.key === 'Escape' && searchInput) {
                    e.preventDefault();
                    setSearchInput('');
                    setSearchQuery('');
                  }
                }}
                className={`w-full rounded-none border border-neutral-800 sm:border-r-0 bg-neutral-900/50 py-3.5 pl-11 ${
                  searchInput.length > 0 ? 'pr-11' : 'pr-4'
                } text-base md:text-sm text-neutral-100 outline-none placeholder:text-neutral-500 min-h-[44px] focus:border-neutral-600`}
              />
              {searchInput.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  data-testid="clear-vendor-search-btn"
                  className="absolute right-0 top-0 bottom-0 flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-none text-neutral-400 transition hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
                >
                  <X size={14} weight="bold" />
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery(searchInput)}
              className="w-full sm:w-auto shrink-0 whitespace-nowrap rounded-none bg-neutral-100 px-6 py-3.5 text-sm font-semibold text-neutral-950 hover:bg-white min-h-[44px]"
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
                  className={`rounded-none border px-4 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? 'border-neutral-600 bg-neutral-800 text-neutral-100'
                      : 'border-neutral-800 bg-transparent text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                  }`}
                >
                  {pill}
                </button>
              );
            })}
          </div>

          <div className="flex items-start gap-3 rounded-none border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <Warning className="mt-0.5 flex-shrink-0 text-[18px] text-amber-500" />
            <p className="text-xs leading-relaxed text-amber-400/80">
              <span className="font-bold text-amber-400">Disclaimer: </span>
              PaperWorking does not vet vendors. You must verify credentials and references before
              engaging.
            </p>
          </div>

          {listings.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-100">Open vendor listings</h3>
                <span className="text-xs text-neutral-400">{listingsCount} visible</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {listings.map((listing) => (
                  <article
                    key={listing.id}
                    className="rounded-none border border-neutral-800 bg-neutral-900/40 p-4"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <p className="text-[11px] uppercase tracking-[0.07em] text-neutral-400">
                        {listing.vendorType}
                      </p>
                      {listing.isNewListing ? (
                        <span className="rounded-none bg-neutral-800 px-2 py-0.5 text-[10px] uppercase tracking-[0.06em] text-neutral-300">
                          New
                        </span>
                      ) : null}
                    </div>
                    <h4 className="text-base font-semibold text-neutral-100">{listing.title}</h4>
                    <p className="mt-1 text-sm text-neutral-400">{listing.city}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-neutral-400">
                      <span>{listing.budgetRange}</span>
                      <span>Response {listing.responseTime}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {loadingVendors ? (
            <div className="flex items-center justify-center gap-3 py-24 text-neutral-400">
              <CircleNotch className="h-5 w-5 animate-spin text-neutral-400" />
              <span className="text-sm">Loading vendors…</span>
            </div>
          ) : vendors.length === 0 ? (
            <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 py-24 text-center">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-none border border-neutral-800 bg-neutral-900 text-neutral-400">
                <MagnifyingGlass className="h-6 w-6 text-neutral-400" />
              </div>
              <h3 className="text-lg font-bold leading-snug text-neutral-100">No Registered Vendors</h3>
              <p className="text-xs leading-relaxed text-neutral-400">
                There are currently no active service providers registered in the PaperWorking
                Vendor Directory.
              </p>
            </div>
          ) : displayVendors.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-neutral-400">
              <MagnifyingGlass className="h-8 w-8 text-neutral-600" />
              <p className="text-sm">No vendors found for the selected filters.</p>
              <button
                type="button"
                onClick={() => {
                  setActiveFilter('All');
                  setSearchQuery('');
                  setSearchInput('');
                }}
                className="text-xs text-neutral-100 hover:underline"
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

      {/* Skills Required Gate Modal */}
      {isSkillsGateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="skills-gate-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div
            data-testid="skills-required-modal"
            className="w-full max-w-lg rounded-none border border-neutral-800 bg-neutral-950 p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4 border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-none border border-amber-500/30 bg-amber-500/10 text-amber-400">
                  <Warning className="h-5 w-5" />
                </div>
                <div>
                  <h3 id="skills-gate-modal-title" className="text-lg font-bold text-neutral-100">
                    {userVendorSkills && userVendorSkills.length > 0
                      ? 'Vendor Directory Service Skills'
                      : 'Skills Required to List Services'}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Vendor Directory Requirement
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSkillsGateOpen(false)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-none text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 transition"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-neutral-300 leading-relaxed">
                Before posting or listing on the PaperWorking Vendor Directory, you must select <strong>1 to 3 professional skills</strong> from our 38 certified professions.
              </p>
              <p className="text-xs text-neutral-400 leading-relaxed">
                This identifies your capabilities in directory search engines so investors and deal operators can find and request quotes from you.
              </p>
              {userVendorSkills && userVendorSkills.length > 0 ? (
                <div
                  data-testid="skills-gate-active-skills"
                  className="rounded-none border border-neutral-800 bg-neutral-900/70 p-3 space-y-2"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-300">
                    Active Directory Skills ({userVendorSkills.length}/3 Selected)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {userVendorSkills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-none border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-100"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-neutral-800 pt-4">
              <button
                type="button"
                onClick={() => setIsSkillsGateOpen(false)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-none border border-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-300 hover:bg-neutral-800 transition"
              >
                Cancel
              </button>
              {userVendorSkills && userVendorSkills.length > 0 ? (
                <Link
                  href="/vendor-portal/profile"
                  data-testid="skills-gate-vendor-profile-link"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-none border border-neutral-700 bg-neutral-900 px-4 py-2 text-xs font-semibold text-neutral-100 hover:bg-neutral-800 transition"
                >
                  Vendor Profile
                </Link>
              ) : null}
              <Link
                href="/dashboard/settings?section=general#vendor-skills"
                data-testid="skills-gate-settings-link"
                className="inline-flex min-h-[44px] items-center justify-center rounded-none bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-white transition"
              >
                Configure 1–3 Skills in Settings →
              </Link>
            </div>
          </div>
        </div>
      )}

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

export default function VendorMarketplacePanel({
  initialSearchInput = '',
}: {
  initialSearchInput?: string;
} = {}) {
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
      <MarketplaceContent initialSearchInput={initialSearchInput} />
    </Suspense>
  );
}
