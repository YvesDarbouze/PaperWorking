'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Briefcase,
  PaperPlaneTilt,
  CheckCircle,
  WarningCircle,
  CircleNotch,
  ShieldCheck,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { useOptionalAuth } from '@/context/AuthContext';
import { setupFocusTrap } from '@/lib/a11y/focus-trap';

export interface DealOfferServicesModalProps {
  deal: {
    id: string;
    slug?: string;
    name?: string;
    propertyName?: string;
    address?: string;
    city?: string;
    state?: string;
    assetClass?: string;
    creatorName?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
}

const TRADE_CATEGORIES = [
  'General Contractor',
  'Commercial Lender / Hard Money',
  'Real Estate Attorney',
  'Property Inspector',
  'Real Estate Appraiser',
  'Architect / Structural Engineer',
  'Plumbing Specialist',
  'Electrical Specialist',
  'HVAC Specialist',
  'Roofing Contractor',
  'Property Management',
  'Listing / Buyer Brokerage',
];

export default function DealOfferServicesModal({
  deal,
  isOpen,
  onClose,
  onSuccessToast,
}: DealOfferServicesModalProps) {
  const auth = useOptionalAuth();

  const [tradeCategory, setTradeCategory] = useState(TRADE_CATEGORIES[0]);
  const [companyName, setCompanyName] = useState('');
  const [proposal, setProposal] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [estimatedTurnaround, setEstimatedTurnaround] = useState('2–4 Weeks');
  const [estimatedBudgetRange, setEstimatedBudgetRange] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const modalRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSubmitted(false);
      setError(null);
      return;
    }

    const cleanup = setupFocusTrap({
      container: modalRef.current,
      isActive: isOpen,
      onClose,
    });

    return () => {
      cleanup?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const dealName = deal.propertyName || deal.name || deal.address || 'Real Estate Project';
  const dealId = deal.id || deal.slug;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Please provide your company or professional name.');
      return;
    }
    if (proposal.trim().length < 10) {
      setError('Please provide a proposal or scope note of at least 10 characters.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/deals/${dealId}/offer-services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeCategory,
          companyName: companyName.trim(),
          proposal: proposal.trim(),
          licenseNumber: licenseNumber.trim() || undefined,
          estimatedTurnaround,
          estimatedBudgetRange: estimatedBudgetRange.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit service proposal.');
      }

      setSubmitted(true);
      if (onSuccessToast) {
        onSuccessToast(`Service proposal submitted to ${dealName}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="offer-services-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div
        ref={modalRef}
        data-testid="offer-services-modal"
        className="relative w-full max-w-xl rounded-none border border-neutral-800 bg-neutral-950 p-6 shadow-2xl text-left my-8"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-none bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Briefcase className="h-4 w-4" />
              </span>
              <h2 id="offer-services-title" className="text-lg font-bold text-neutral-100">
                Offer Services on Deal
              </h2>
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              Submit your trade or professional services directly to the operator of{' '}
              <strong className="text-neutral-200">{dealName}</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-none p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-none border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <CheckCircle className="h-6 w-6" weight="bold" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-100">Proposal Dispatched</h3>
              <p className="mt-1 text-xs text-neutral-400 max-w-sm mx-auto">
                Your service proposal for <strong className="text-neutral-300">{tradeCategory}</strong>{' '}
                has been delivered to the deal operator. You will be notified in your Inbox when they respond.
              </p>
            </div>
            <div className="pt-2">
              <Button variant="primary" size="sm" onClick={onClose} className="rounded-none min-h-[44px] px-6">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-none border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-300"
              >
                <WarningCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Service / Trade Category *
                </label>
                <select
                  value={tradeCategory}
                  onChange={(e) => setTradeCategory(e.target.value)}
                  className="w-full rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-100 focus:border-neutral-500 focus:outline-none min-h-[44px]"
                >
                  {TRADE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Company / Provider Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Commercial Construction"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none min-h-[44px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  License / Reg # (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. GC-948102-TX"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="w-full rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Estimated Turnaround
                </label>
                <select
                  value={estimatedTurnaround}
                  onChange={(e) => setEstimatedTurnaround(e.target.value)}
                  className="w-full rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-100 focus:border-neutral-500 focus:outline-none min-h-[44px]"
                >
                  <option value="Immediate (< 48 hrs)">Immediate (&lt; 48 hrs)</option>
                  <option value="1–2 Weeks">1–2 Weeks</option>
                  <option value="2–4 Weeks">2–4 Weeks</option>
                  <option value="1–3 Months">1–3 Months</option>
                  <option value="Flexible / Negotiable">Flexible / Negotiable</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Proposal &amp; Service Scope *
              </label>
              <textarea
                required
                rows={4}
                placeholder="Explain the trade services you provide, your local coverage, relevant past projects, or your preliminary proposal for this asset..."
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                className="w-full rounded-none border border-neutral-800 bg-neutral-900 p-3 text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Contact Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="contact@firm.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Direct Phone (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="(555) 000-0000"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none min-h-[44px]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-none border border-neutral-800 bg-neutral-900/40 p-2.5 text-[11px] text-neutral-400">
              <ShieldCheck className="h-4 w-4 shrink-0 text-neutral-300" />
              <span>
                As a registered service provider, your proposal will be flagged as verified in the operator’s project portal.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-800">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClose}
                disabled={submitting}
                className="rounded-none min-h-[44px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submitting}
                className="rounded-none min-h-[44px] gap-2 px-5"
              >
                {submitting ? (
                  <>
                    <CircleNotch className="h-4 w-4 animate-spin" />
                    <span>Transmitting Proposal…</span>
                  </>
                ) : (
                  <>
                    <PaperPlaneTilt className="h-4 w-4" />
                    <span>Submit Service Proposal</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
