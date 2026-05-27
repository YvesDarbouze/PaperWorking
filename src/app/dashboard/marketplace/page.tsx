'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { VendorProfile } from '@/types/schema';

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

/* ── Demo vendor cards (shown when API returns empty) ── */
const DEMO_VENDORS = [
  {
    id: 'demo-1',
    companyName: 'Prime Structural Engineering',
    category: 'Inspector',
    location: 'Miami, FL',
    rating: 4.8,
    bio: 'Full-service structural and property inspection firm specializing in multi-family and commercial real estate due diligence.',
    specialties: ['Structural', 'Multi-Family', 'Due Diligence'],
  },
  {
    id: 'demo-2',
    companyName: 'Capital Bridge Lending',
    category: 'Lender',
    location: 'New York, NY',
    rating: 4.9,
    bio: 'Bridge and hard-money lender for real estate investors with fast closings and competitive rates across the Tri-State area.',
    specialties: ['Bridge Loans', 'Hard Money', 'Fast Close'],
  },
  {
    id: 'demo-3',
    companyName: 'Coastal Title & Escrow',
    category: 'Attorney',
    location: 'Fort Lauderdale, FL',
    rating: 4.7,
    bio: 'Full-service real estate law firm handling title, escrow, and closing services for residential and commercial transactions.',
    specialties: ['Title', 'Escrow', 'Closings'],
  },
  {
    id: 'demo-4',
    companyName: 'ProBuild Contractors',
    category: 'Contractor',
    location: 'Brooklyn, NY',
    rating: 4.6,
    bio: 'Licensed general contractors focused on value-add renovations, BRRRR rehabs, and multi-unit upgrades across the NYC metro.',
    specialties: ['BRRRR Rehab', 'Value-Add', 'Multi-Unit'],
  },
  {
    id: 'demo-5',
    companyName: 'Premier Property Group',
    category: 'Property Manager',
    location: 'Miami, FL',
    rating: 4.8,
    bio: 'Full-scope property management for residential portfolios — tenant screening, maintenance coordination, and financial reporting.',
    specialties: ['Tenant Screening', 'Maintenance', 'Financials'],
  },
  {
    id: 'demo-6',
    companyName: 'NextGen Realty Partners',
    category: 'Agent',
    location: 'Newark, NJ',
    rating: 4.7,
    bio: 'Investor-focused real estate agents helping buyers identify off-market opportunities and negotiate acquisition deals.',
    specialties: ['Off-Market', 'Buyer Rep', 'Negotiation'],
  },
];

const CATEGORY_BADGE_STYLES: Record<string, string> = {
  Inspector:        'bg-sky-400/10 border-sky-400/20 text-sky-400',
  Lender:           'bg-teal-400/10 border-teal-400/20 text-teal-400',
  Attorney:         'bg-violet-400/10 border-violet-400/20 text-violet-400',
  Contractor:       'bg-orange-400/10 border-orange-400/20 text-orange-400',
  'Property Manager': 'bg-amber-400/10 border-amber-400/20 text-amber-400',
  Agent:            'bg-pink-400/10 border-pink-400/20 text-pink-400',
};

function VendorCard({
  vendor,
  onRequestQuote,
}: {
  vendor: typeof DEMO_VENDORS[number] & { id: string };
  onRequestQuote: (v: any) => void;
}) {
  const badgeClass = CATEGORY_BADGE_STYLES[vendor.category] ?? 'bg-white/5 border-white/10 text-slate-400';
  const stars = Math.round(vendor.rating * 2) / 2;

  return (
    <div
      className="rounded-xl border border-white/[0.08] flex flex-col gap-4 p-5 transition-all duration-200 hover:border-teal-400/30 hover:shadow-[0_0_24px_rgba(45,212,191,0.06)]"
      style={{ background: 'rgba(24,33,39,0.6)' }}
    >
      {/* Top row: category badge */}
      <div className="flex items-center justify-between">
        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
          {vendor.category}
        </span>
        <span className="flex items-center gap-1 px-2 py-0.5 rounded border border-amber-400/20 bg-amber-400/10 text-[10px] font-bold text-amber-400">
          <Star className="w-3 h-3 fill-amber-400 stroke-none" />
          {vendor.rating.toFixed(1)}
        </span>
      </div>

      {/* Name */}
      <div>
        <h3 className="text-base font-bold text-white leading-snug">{vendor.companyName}</h3>
        <p className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          {vendor.location}
        </p>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-400 leading-relaxed line-clamp-2 flex-1">{vendor.bio}</p>

      {/* Specialty tags */}
      <div className="flex flex-wrap gap-1.5">
        {(vendor.specialties ?? []).slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded text-[10px] font-semibold text-slate-400 border border-white/[0.06] bg-white/[0.03]"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        <button
          type="button"
          className="flex-1 px-3 py-2 rounded-lg border border-teal-500/40 text-teal-400 text-xs font-bold hover:border-teal-400 hover:bg-teal-400/5 transition-all"
        >
          View Profile
        </button>
        <button
          type="button"
          onClick={() => onRequestQuote(vendor)}
          className="flex-1 px-3 py-2 rounded-lg bg-teal-500 text-black text-xs font-bold hover:bg-teal-400 transition-all"
        >
          Request Quote
        </button>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  /* ── Preserved Firestore / data hooks ── */
  useAllDealsSync();

  const { profile, user } = useAuth();
  const projects = useProjectStore((state) => state.projects);
  const hasActiveSub = isSubscriptionActive(profile);

  /* ── Search & filter state ── */
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('All');

  /* ── Vendor data state (preserved from original) ── */
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);

  /* ── Quote modal state (preserved from original) ── */
  const [selectedVendor, setSelectedVendor] = useState<VendorProfile | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

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

  /* ── Derive display list: API results → demo fallback ── */
  const displayVendors = useMemo(() => {
    let source: typeof DEMO_VENDORS =
      vendors.length > 0
        ? vendors.map((v) => ({
            id: v.id ?? String(Math.random()),
            companyName: v.companyName ?? 'Unknown',
            category: (v.type as string) ?? 'Other',
            location: (v.licensingStates ?? []).slice(0, 1).join(', ') || 'N/A',
            rating: v.overallRating ?? 4.5,
            bio: v.bio ?? '',
            specialties: v.specialties ?? [],
          }))
        : DEMO_VENDORS;

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

    return source;
  }, [vendors, activeFilter]);

  const handleRequestQuote = (vendor: any) => {
    setSelectedVendor(vendor as VendorProfile);
    setIsQuoteModalOpen(true);
  };

  const handleFindVendors = () => {
    setSearchQuery(searchInput);
  };

  return (
    <div
      className="min-h-full px-6 lg:px-8 py-8 space-y-6"
      style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
    >
      {/* ── Page Header ── */}
      <div className="space-y-1">
        <h1 className="text-4xl font-bold text-white tracking-tight">Vendor Marketplace</h1>
        <p className="text-slate-400 text-sm">
          Find trusted service providers for your real estate portfolio
        </p>
      </div>

      {/* ── Search Bar ── */}
      <div className="flex gap-0">
        <div className="relative flex-1">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by City or Zip Code..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFindVendors()}
            className="w-full pl-11 pr-4 py-3.5 bg-[rgba(24,33,39,0.7)] border border-white/10 border-r-0 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 transition-colors"
            style={{ borderRadius: '0.5rem 0 0 0.5rem' }}
          />
        </div>
        <button
          type="button"
          onClick={handleFindVendors}
          className="px-6 py-3.5 bg-teal-500 text-black text-sm font-bold hover:bg-teal-400 transition-colors"
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
                  ? 'bg-teal-400/10 border-teal-400 text-teal-400'
                  : 'border-white/10 text-slate-400 hover:border-teal-400/40 hover:text-teal-400 bg-transparent'
              }`}
            >
              {pill}
            </button>
          );
        })}
      </div>

      {/* ── Disclaimer Banner ── */}
      <div
        className="flex items-start gap-3 px-4 py-3 rounded-lg border border-white/[0.06] border-l-4 border-l-amber-500"
        style={{ background: 'rgba(245,158,11,0.05)' }}
      >
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-400/80 leading-relaxed">
          <span className="font-bold text-amber-400">Disclaimer: </span>
          PaperWorking does not vet vendors. Investors must perform their own due diligence prior to engagement.
        </p>
      </div>

      {/* ── Vendor Grid ── */}
      {loadingVendors ? (
        <div className="flex justify-center items-center py-24 gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading vendors...</span>
        </div>
      ) : displayVendors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
          <Search className="w-8 h-8 opacity-30" />
          <p className="text-sm">No vendors found for the selected filters.</p>
          <button
            type="button"
            onClick={() => { setActiveFilter('All'); setSearchQuery(''); setSearchInput(''); }}
            className="text-xs text-teal-400 hover:underline"
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
            />
          ))}
        </div>
      )}

      {/* ── Quote Modal (preserved from original) ── */}
      <VendorRequestModal
        isOpen={isQuoteModalOpen}
        vendor={selectedVendor}
        onClose={() => {
          setIsQuoteModalOpen(false);
          setSelectedVendor(null);
        }}
      />
    </div>
  );
}
