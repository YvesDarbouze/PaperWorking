'use client';

import { useEffect, useRef } from 'react';
import { RatingDisplay } from './RatingDisplay';

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

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  function handleBackdropClick(e: React.MouseEvent) {
    if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
      onClose();
    }
  }

  if (!open || !vendor) return null;

  const availabilityLabel =
    vendor.availability === 'Available'
      ? 'Now'
      : vendor.availability === 'Busy'
        ? 'Busy'
        : '1 Wk';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={`${vendor.companyName} details`}
      onClick={handleBackdropClick}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        ref={sheetRef}
        className="relative h-full w-full max-w-md overflow-y-auto border-l border-white/[0.06] bg-[#121014]/95 shadow-2xl backdrop-blur-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-[#121014]/90 px-6 py-4 backdrop-blur-xl">
          <h2 className="text-sm font-bold uppercase tracking-widest text-white/45">Vendor Profile</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] text-white/45 hover:border-white/10 hover:text-white"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-xl font-bold text-[#fdfffc]">
              {vendor.companyName.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold leading-tight text-[#fdfffc]">
                {vendor.companyName}
              </h3>
              <p className="text-sm font-medium text-white/55">{vendor.type}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {vendor.verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-300">
                    <span className="material-symbols-outlined text-[12px]">verified</span>
                    Verified
                  </span>
                ) : null}
                {vendor.insuranceVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-blue-400">
                    <span className="material-symbols-outlined text-[12px]">shield</span>
                    Insured
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3">
            <RatingDisplay rating={vendor.overallRating} totalReviews={vendor.totalReviews} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3 text-center">
              <p className="font-mono text-lg font-bold text-[#fdfffc]">{vendor.avgTurnaroundDays}d</p>
              <p className="mt-1 text-[9px] uppercase tracking-wider text-white/45">Turnaround</p>
            </div>
            <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3 text-center">
              <p className="truncate font-mono text-lg font-bold text-[#fdfffc]">
                {vendor.feeRangeLabel.split('-')[0]?.trim() ?? '—'}
              </p>
              <p className="mt-1 text-[9px] uppercase tracking-wider text-white/45">Starting Fee</p>
            </div>
            <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3 text-center">
              <p className="text-[10px] font-bold uppercase text-emerald-300">{availabilityLabel}</p>
              <p className="mt-1 text-[9px] uppercase tracking-wider text-white/45">Availability</p>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-white/45">About</h4>
            <p className="line-clamp-4 text-sm leading-relaxed text-white/70">{vendor.bio}</p>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-white/45">Specialties</h4>
            <div className="flex flex-wrap gap-1.5">
              {vendor.specialties.map((s) => (
                <span
                  key={s}
                  className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-xs text-white/70"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2 text-sm text-white/70">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-white/40">location_on</span>
              <span>Licensed: {vendor.licensingStates.join(', ')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-white/40">schedule</span>
              <span>{vendor.availability}</span>
            </div>
          </div>

          {onRequestQuote ? (
            <button
              type="button"
              onClick={() => onRequestQuote(vendor)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#fdfffc] py-3 text-sm font-bold text-[#0d0a0b] hover:bg-white/90"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              Request Quote
            </button>
          ) : null}

          <p className="pt-2 text-center text-[9px] leading-relaxed text-white/35">
            PaperWorking does not vet vendors. You must verify credentials and references before engaging.
          </p>
        </div>
      </div>
    </div>
  );
}
