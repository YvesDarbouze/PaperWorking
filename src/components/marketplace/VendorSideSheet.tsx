'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  X,
  Star,
  Shield,
  MapPin,
  Clock,
  ExternalLink,
  BadgeCheck,
  MessageSquare,
  CheckCircle,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   PaperWorking — VendorSideSheet
   Slide-out sheet for quick vendor preview in marketplace.
   Opens from right edge with glass-card aesthetics.
   ═══════════════════════════════════════════════════════════════ */

export interface VendorSideSheetData {
  uid: string;
  companyName: string;
  type: string;
  bio: string;
  specialties: string[];
  licensingStates: string[];
  serviceAreas?: string[];
  avgTurnaroundDays: number;
  overallRating: number;
  totalReviews: number;
  availability: string;
  feeRangeLabel: string;
  verified: boolean;
  insuranceVerified: boolean;
  slug?: string;
}

interface VendorSideSheetProps {
  vendor: VendorSideSheetData | null;
  open: boolean;
  onClose: () => void;
  onRequestQuote?: (vendor: VendorSideSheetData) => void;
}

export default function VendorSideSheet({
  vendor,
  open,
  onClose,
  onRequestQuote,
}: VendorSideSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when sheet is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  // Close on click outside
  function handleBackdropClick(e: React.MouseEvent) {
    if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
      onClose();
    }
  }

  if (!open || !vendor) return null;

  const slug =
    vendor.slug ??
    vendor.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={`${vendor.companyName} details`}
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative w-full max-w-md h-full bg-[#0a1a23]/95 backdrop-blur-2xl border-l border-white/[0.06] shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0a1a23]/90 backdrop-blur-xl border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#9E9DA0]">
            Vendor Profile
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-white/[0.06] flex items-center justify-center text-[#9E9DA0] hover:text-white hover:border-white/10 transition-all"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Company Header */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#454955]/10 border border-[#454955]/20 flex items-center justify-center text-[#454955] font-bold text-xl flex-shrink-0">
              {vendor.companyName.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold leading-tight truncate">
                {vendor.companyName}
              </h3>
              <p className="text-sm text-[#454955] font-medium">
                {vendor.type}
              </p>
              {/* Badges */}
              <div className="flex gap-1.5 mt-2">
                {vendor.verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#454955]/10 border border-[#454955]/20 text-[#454955] text-[9px] font-bold uppercase">
                    <BadgeCheck className="w-3 h-3" /> Verified
                  </span>
                )}
                {vendor.insuranceVerified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-bold uppercase">
                    <Shield className="w-3 h-3" /> Insured
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Rating Row */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.round(vendor.overallRating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-600'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-bold font-mono">
              {vendor.overallRating}
            </span>
            <span className="text-xs text-[#9E9DA0]">
              ({vendor.totalReviews} reviews)
            </span>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <p className="text-lg font-bold font-mono text-[#454955]">
                {vendor.avgTurnaroundDays}d
              </p>
              <p className="text-[9px] text-[#9E9DA0] uppercase tracking-wider mt-1">
                Turnaround
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <p className="text-lg font-bold font-mono text-[#454955]">
                {vendor.feeRangeLabel.split('-')[0]?.trim() ?? '—'}
              </p>
              <p className="text-[9px] text-[#9E9DA0] uppercase tracking-wider mt-1">
                Starting Fee
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <div
                className={`inline-flex items-center gap-1 ${
                  vendor.availability === 'Available'
                    ? 'text-pw-success'
                    : vendor.availability === 'Busy'
                      ? 'text-amber-400'
                      : 'text-blue-400'
                }`}
              >
                <CheckCircle className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase">
                  {vendor.availability === 'Available'
                    ? 'Now'
                    : vendor.availability === 'Busy'
                      ? 'Busy'
                      : '1 Wk'}
                </span>
              </div>
              <p className="text-[9px] text-[#9E9DA0] uppercase tracking-wider mt-1">
                Availability
              </p>
            </div>
          </div>

          {/* Bio */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#9E9DA0] mb-2">
              About
            </h4>
            <p className="text-sm text-[#C0BEC2] leading-relaxed line-clamp-4">
              {vendor.bio}
            </p>
          </div>

          {/* Specialties */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#9E9DA0] mb-2">
              Specialties
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {vendor.specialties.map((s) => (
                <span
                  key={s}
                  className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.06] text-xs text-[#C0BEC2]"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Service Info */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-[#C0BEC2]">
              <MapPin className="w-4 h-4 text-[#454955]" />
              <span>
                Licensed: {vendor.licensingStates.join(', ')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[#C0BEC2]">
              <Clock className="w-4 h-4 text-[#454955]" />
              <span>{vendor.availability}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            {onRequestQuote && (
              <button
                onClick={() => onRequestQuote(vendor)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#454955] text-[#0d0a0b] text-sm font-bold hover:bg-[#454955]/90 transition-all shadow-[0_0_20px_rgba(69, 73, 85,0.15)]"
              >
                <MessageSquare className="w-4 h-4" />
                Request Quote
              </button>
            )}
            <Link
              href={`/pros/${slug}`}
              target="_blank"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/[0.08] text-sm font-bold text-[#C0BEC2] hover:text-white hover:border-[#454955]/30 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Full Profile
            </Link>
          </div>

          {/* Disclosure */}
          <p className="text-[9px] text-[#6B6870] leading-relaxed text-center pt-2">
            PaperWorking does not vet vendors. You must verify credentials and references before engaging. All ratings reflect investor feedback.
          </p>
        </div>
      </div>
    </div>
  );
}
