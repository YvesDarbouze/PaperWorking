'use client';

import { useEffect, useRef } from 'react';
import { X, SealCheck, ShieldCheck, MapPin, Clock, ChatTeardropText } from '@phosphor-icons/react';
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
        className="relative h-full w-full max-w-md overflow-y-auto border-l border-neutral-800 bg-neutral-950 shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-950/90 px-6 py-4 backdrop-blur-xl">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">Vendor Profile</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-none border border-neutral-800 text-neutral-400 hover:text-white transition"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-none border border-neutral-800 bg-neutral-900 text-xl font-bold text-white">
              {vendor.companyName.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold leading-tight text-white">
                {vendor.companyName}
              </h3>
              <p className="text-sm font-medium text-neutral-400">{vendor.type}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {vendor.verified ? (
                  <span className="inline-flex items-center gap-1 rounded-none border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium uppercase text-emerald-400">
                    <SealCheck className="h-3 w-3 text-emerald-400" />
                    Verified
                  </span>
                ) : null}
                {vendor.insuranceVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-none border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-[9px] font-medium uppercase text-neutral-300">
                    <ShieldCheck className="h-3 w-3 text-neutral-300" />
                    Insured
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-none border border-neutral-800 bg-neutral-900/40 p-3">
            <RatingDisplay rating={vendor.overallRating} totalReviews={vendor.totalReviews} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-none border border-neutral-800 bg-neutral-900/40 p-3 text-center">
              <p className="font-mono text-lg font-semibold text-white">{vendor.avgTurnaroundDays}d</p>
              <p className="mt-1 text-[9px] uppercase tracking-wider text-neutral-400">Turnaround</p>
            </div>
            <div className="rounded-none border border-neutral-800 bg-neutral-900/40 p-3 text-center">
              <p className="truncate font-mono text-lg font-semibold text-white">
                {vendor.feeRangeLabel.split('-')[0]?.trim() ?? 'N/A'}
              </p>
              <p className="mt-1 text-[9px] uppercase tracking-wider text-neutral-400">Starting Fee</p>
            </div>
            <div className="rounded-none border border-neutral-800 bg-neutral-900/40 p-3 text-center">
              <p className="text-[10px] font-medium uppercase text-emerald-400">{availabilityLabel}</p>
              <p className="mt-1 text-[9px] uppercase tracking-wider text-neutral-400">Availability</p>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-widest text-neutral-400">About</h4>
            <p className="line-clamp-4 text-sm leading-relaxed text-neutral-300">{vendor.bio}</p>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-widest text-neutral-400">Specialties</h4>
            <div className="flex flex-wrap gap-1.5">
              {vendor.specialties.map((s) => (
                <span
                  key={s}
                  className="rounded-none border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-300"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2 text-sm text-neutral-300">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-neutral-400" />
              <span>Licensed: {vendor.licensingStates.join(', ')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-neutral-400" />
              <span>{vendor.availability}</span>
            </div>
          </div>

          {onRequestQuote ? (
            <button
              type="button"
              onClick={() => onRequestQuote(vendor)}
              className="flex w-full items-center justify-center gap-2 rounded-none bg-white py-3 text-sm font-medium text-neutral-950 hover:bg-neutral-200 min-h-[44px] transition"
            >
              <ChatTeardropText className="h-4 w-4" />
              Request Quote
            </button>
          ) : null}

          <p className="pt-2 text-center text-[9px] leading-relaxed text-neutral-500">
            PaperWorking does not vet vendors. You must verify credentials and references before engaging.
          </p>
        </div>
      </div>
    </div>
  );
}
