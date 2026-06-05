'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Star,
  Loader2,
  Shield,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { VendorRequestModal } from '@/components/marketplace/VendorRequestModal';
import type { VendorProfile } from '@/types/schema';

/* ═══════════════════════════════════════════════════════════════
   Vendor Detail Page — /dashboard/marketplace/[vendorId]
   Shows full vendor profile from Firestore or demo fallback.
   ═══════════════════════════════════════════════════════════════ */

/* ── Demo vendor cards (mirrors marketplace page for fallback) ── */
const DEMO_VENDORS: Record<
  string,
  {
    id: string;
    companyName: string;
    category: string;
    location: string;
    rating: number;
    bio: string;
    specialties: string[];
    totalReviews: number;
    avgTurnaroundDays: number;
    feeRangeLabel: string;
    verified: boolean;
    availability: string;
  }
> = {
  'demo-1': {
    id: 'demo-1',
    companyName: 'Prime Structural Engineering',
    category: 'Inspector',
    location: 'Miami, FL',
    rating: 4.8,
    bio: 'Full-service structural and property inspection firm specializing in multi-family and commercial real estate due diligence. Our team of licensed engineers provides thorough assessments for acquisition, renovation, and compliance needs.',
    specialties: ['Structural', 'Multi-Family', 'Due Diligence'],
    totalReviews: 24,
    avgTurnaroundDays: 3,
    feeRangeLabel: '$400 – $1,200',
    verified: true,
    availability: 'Available',
  },
  'demo-2': {
    id: 'demo-2',
    companyName: 'Capital Bridge Lending',
    category: 'Lender',
    location: 'New York, NY',
    rating: 4.9,
    bio: 'Bridge and hard-money lender for real estate investors with fast closings and competitive rates across the Tri-State area. We specialize in BRRRR strategies, fix-and-flip financing, and ground-up construction loans.',
    specialties: ['Bridge Loans', 'Hard Money', 'Fast Close'],
    totalReviews: 42,
    avgTurnaroundDays: 7,
    feeRangeLabel: '2–4 points + 10–13% APR',
    verified: true,
    availability: 'Available',
  },
  'demo-3': {
    id: 'demo-3',
    companyName: 'Coastal Title & Escrow',
    category: 'Attorney',
    location: 'Fort Lauderdale, FL',
    rating: 4.7,
    bio: 'Full-service real estate law firm handling title, escrow, and closing services for residential and commercial transactions. Trusted by investors across South Florida for seamless closings.',
    specialties: ['Title', 'Escrow', 'Closings'],
    totalReviews: 31,
    avgTurnaroundDays: 5,
    feeRangeLabel: '$800 – $2,500',
    verified: true,
    availability: 'Available',
  },
  'demo-4': {
    id: 'demo-4',
    companyName: 'ProBuild Contractors',
    category: 'Contractor',
    location: 'Brooklyn, NY',
    rating: 4.6,
    bio: 'Licensed general contractors focused on value-add renovations, BRRRR rehabs, and multi-unit upgrades across the NYC metro. We handle full gut renovations and cosmetic refreshes with transparent pricing.',
    specialties: ['BRRRR Rehab', 'Value-Add', 'Multi-Unit'],
    totalReviews: 18,
    avgTurnaroundDays: 45,
    feeRangeLabel: '$15K – $150K+',
    verified: true,
    availability: 'Available',
  },
  'demo-5': {
    id: 'demo-5',
    companyName: 'Premier Property Group',
    category: 'Property Manager',
    location: 'Miami, FL',
    rating: 4.8,
    bio: 'Full-scope property management for residential portfolios — tenant screening, maintenance coordination, and financial reporting. Serving single-family, multi-family, and small commercial properties.',
    specialties: ['Tenant Screening', 'Maintenance', 'Financials'],
    totalReviews: 36,
    avgTurnaroundDays: 2,
    feeRangeLabel: '8–10% of monthly rent',
    verified: true,
    availability: 'Available',
  },
  'demo-6': {
    id: 'demo-6',
    companyName: 'NextGen Realty Partners',
    category: 'Agent',
    location: 'Newark, NJ',
    rating: 4.7,
    bio: 'Investor-focused real estate agents helping buyers identify off-market opportunities and negotiate acquisition deals. We specialize in multi-family and mixed-use properties in the NJ/NY metro.',
    specialties: ['Off-Market', 'Buyer Rep', 'Negotiation'],
    totalReviews: 15,
    avgTurnaroundDays: 14,
    feeRangeLabel: '2.5–3% commission',
    verified: true,
    availability: 'Available',
  },
};

const CATEGORY_BADGE_STYLES: Record<string, string> = {
  Inspector:          'bg-sky-400/10 border-sky-400/20 text-sky-400',
  Lender:             'bg-[#6E7480]/10 border-[#6E7480]/20 text-[#6E7480]',
  Attorney:           'bg-slate-400/10 border-slate-400/20 text-[#9E9DA0]',
  Contractor:         'bg-orange-400/10 border-orange-400/20 text-orange-400',
  'Property Manager': 'bg-amber-400/10 border-amber-400/20 text-amber-400',
  Agent:              'bg-pink-400/10 border-pink-400/20 text-pink-400',
};

type VendorDetail = {
  id: string;
  companyName: string;
  category: string;
  location: string;
  rating: number;
  bio: string;
  specialties: string[];
  totalReviews: number;
  avgTurnaroundDays: number;
  feeRangeLabel: string;
  verified: boolean;
  availability: string;
  isDemo: boolean;
};

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.vendorId as string;

  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  useEffect(() => {
    const loadVendor = async () => {
      setLoading(true);

      /* Check demo vendors first */
      const demo = DEMO_VENDORS[vendorId];
      if (demo) {
        setVendor({ ...demo, isDemo: true });
        setLoading(false);
        return;
      }

      /* Otherwise fetch from API / Firestore */
      try {
        const res = await fetch(`/api/vendors?id=${encodeURIComponent(vendorId)}`);
        if (res.ok) {
          const data = await res.json();
          const allVendors = data.vendors ?? [];
          const match = allVendors.find((v: any) => v.id === vendorId);
          if (match) {
            setVendor({
              id: match.id,
              companyName: match.companyName ?? 'Unknown',
              category: (match.type as string) ?? 'Other',
              location: (match.licensingStates ?? []).slice(0, 1).join(', ') || 'N/A',
              rating: match.overallRating ?? 4.5,
              bio: match.bio ?? '',
              specialties: match.specialties ?? [],
              totalReviews: match.totalReviews ?? 0,
              avgTurnaroundDays: match.avgTurnaroundDays ?? 0,
              feeRangeLabel: match.feeRangeLabel ?? 'Contact for pricing',
              verified: match.verified ?? false,
              availability: match.availability ?? 'Unknown',
              isDemo: false,
            });
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Vendor detail fetch error', err);
      }

      /* Vendor not found */
      setVendor(null);
      setLoading(false);
    };

    if (vendorId) loadVendor();
  }, [vendorId]);

  const badgeClass = vendor
    ? (CATEGORY_BADGE_STYLES[vendor.category] ?? 'bg-white/5 border-white/10 text-[#9E9DA0]')
    : '';

  if (loading) {
    return (
      <div className="min-h-full px-6 lg:px-8 py-8 flex justify-center items-center">
        <div className="flex items-center gap-3 text-[#6B6870]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading vendor profile...</span>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-full px-6 lg:px-8 py-8 space-y-6">
        <button
          type="button"
          onClick={() => router.push('/dashboard/marketplace')}
          className="flex items-center gap-2 text-sm text-[#9E9DA0] hover:text-[#454955] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </button>
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#6B6870]">
          <p className="text-sm">Vendor not found.</p>
          <button
            type="button"
            onClick={() => router.push('/dashboard/marketplace')}
            className="text-xs text-[#454955] hover:underline"
          >
            Return to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 space-y-6">
      {/* ── Back Navigation ── */}
      <button
        type="button"
        onClick={() => router.push('/dashboard/marketplace')}
        className="flex items-center gap-2 text-sm text-[#9E9DA0] hover:text-[#454955] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Marketplace
      </button>

      {/* ── Sample Data Banner ── */}
      {vendor.isDemo && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-sky-500/20 bg-sky-500/5">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-400/15 border border-sky-400/30 text-sky-400">
            Sample Data
          </span>
          <p className="text-xs text-sky-400/80">
            This is an example vendor profile. Real vendor data will appear once vendors register on the marketplace.
          </p>
        </div>
      )}

      {/* ── Profile Header Card ── */}
      <div className="glass-card rounded-xl border border-pw-border p-6 space-y-5">
        {/* Top row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{vendor.companyName}</h1>
              {vendor.verified && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#454955]/30 bg-[#454955]/10 text-[10px] font-bold text-[#454955]">
                  <Shield className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
                {vendor.category}
              </span>
              <span className="flex items-center gap-1 text-xs text-[#6B6870]">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {vendor.location}
              </span>
            </div>
          </div>

          {/* Rating + CTA */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-400 stroke-none" />
                <span className="text-lg font-bold text-white">{vendor.rating.toFixed(1)}</span>
              </div>
              <p className="text-[10px] text-[#6B6870]">{vendor.totalReviews} review{vendor.totalReviews !== 1 ? 's' : ''}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsQuoteModalOpen(true)}
              className="px-5 py-2.5 rounded-lg bg-[#454955] text-black text-sm font-bold hover:bg-[#454955]/90 transition-all"
            >
              Request Quote
            </button>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <h2 className="text-xs font-bold text-[#6B6870] uppercase tracking-wider">About</h2>
          <p className="text-sm text-[#C0BEC2] leading-relaxed">{vendor.bio}</p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <Clock className="w-4 h-4 text-[#6B6870] flex-shrink-0" />
            <div>
              <p className="text-xs text-[#6B6870]">Avg. Turnaround</p>
              <p className="text-sm font-bold text-white">{vendor.avgTurnaroundDays} day{vendor.avgTurnaroundDays !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <CheckCircle2 className="w-4 h-4 text-[#6B6870] flex-shrink-0" />
            <div>
              <p className="text-xs text-[#6B6870]">Availability</p>
              <p className="text-sm font-bold text-white">{vendor.availability}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <Star className="w-4 h-4 text-[#6B6870] flex-shrink-0" />
            <div>
              <p className="text-xs text-[#6B6870]">Fee Range</p>
              <p className="text-sm font-bold text-white">{vendor.feeRangeLabel}</p>
            </div>
          </div>
        </div>

        {/* Specialties */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-[#6B6870] uppercase tracking-wider">Specialties</h2>
          <div className="flex flex-wrap gap-2">
            {vendor.specialties.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded text-xs font-semibold text-[#C0BEC2] border border-white/[0.08] bg-white/[0.04]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quote Modal ── */}
      <VendorRequestModal
        isOpen={isQuoteModalOpen}
        vendor={vendor as unknown as VendorProfile}
        onClose={() => setIsQuoteModalOpen(false)}
      />
    </div>
  );
}
