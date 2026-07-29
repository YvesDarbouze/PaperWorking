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
import { RatingDisplay } from '@/components/marketplace/RatingDisplay';
import type { VendorProfile } from '@/types/schema';

/* ═══════════════════════════════════════════════════════════════
   Vendor Detail Page — /dashboard/marketplace/[vendorId]
   Shows full vendor profile from Firestore or demo fallback.
   ═══════════════════════════════════════════════════════════════ */

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

      /* Fetch from API / Firestore */
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
              rating: match.overallRating ?? 0,
              bio: match.bio ?? '',
              specialties: match.specialties ?? [],
              totalReviews: match.totalReviews ?? 0,
              avgTurnaroundDays: match.avgTurnaroundDays ?? 0,
              feeRangeLabel: match.feeRangeLabel ?? 'Contact for pricing',
              verified: match.verified ?? false,
              availability: match.availability ?? 'Unknown',
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
              <RatingDisplay rating={vendor.rating} totalReviews={vendor.totalReviews} />
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
