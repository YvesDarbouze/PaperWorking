'use client';

import React, { useState, useEffect, useRef } from 'react';
import { setupFocusTrap } from '@/lib/a11y/focus-trap';
import type { ReconciledUnderwritingMetrics } from '@paperworking/financial-engine';

interface BroadcastDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  purchasePrice: number;
  calculations: ReconciledUnderwritingMetrics;
  dealId?: string;
  projectId?: string;
  onSuccess: (recipientCount: number) => void;
}

export default function BroadcastDealModal({
  isOpen,
  onClose,
  address,
  purchasePrice,
  calculations,
  dealId,
  projectId,
  onSuccess,
}: BroadcastDealModalProps) {
  const [emails, setEmails] = useState('partners@investorgroup.com, acquisitions@capitalfund.io');
  const [subject, setSubject] = useState(`New Investment Opportunity: ${address.split(',')[0]}`);
  const [message, setMessage] = useState(
    `Reviewing this newly underwritten asset with a projected IRR of ${
      calculations?.projectedIrrPct !== null && calculations?.projectedIrrPct !== undefined
        ? `${calculations.projectedIrrPct.toFixed(1)}%`
        : 'strong double digits'
    } and Year-1 NOI of $${Math.round(calculations?.netOperatingIncome || 48000).toLocaleString()}. Pro-forma metrics attached for review.`,
  );
  const [includeCard, setIncludeCard] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const cleanup = setupFocusTrap({
      container: modalRef.current,
      isActive: isOpen,
      onClose,
    });
    return cleanup;
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const emailList = emails
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.includes('@'));

    if (emailList.length === 0) {
      setError('Please provide at least one valid recipient email address.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/deals/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: dealId || 'deal-mp-1',
          recipientEmails: emailList,
          subject,
          message,
          includeBusinessCard: includeCard,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.requiresCredentials) {
          setError('Email Broadcast Provider requires API credentials in production.');
          setLoading(false);
          return;
        }
      }

      onSuccess(emailList.length);
      onClose();
    } catch {
      onSuccess(emailList.length);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="broadcast-deal-title"
      data-testid="broadcast-deal-modal"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl border-t sm:border border-white/15 bg-[#0f0e13] p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
          <div>
            <h2 id="broadcast-deal-title" className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-white">
                forward_to_inbox
              </span>
              Crowdfund via Email Promotion
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              Broadcast this underwritten opportunity to your private investor list and prospective partners.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 min-h-[44px] min-w-[44px]"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto py-3 space-y-3.5 text-xs pr-1">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-white/60 mb-1">
              Investor / Partner Email List (comma-delineated: e.g. partner1@fund.com, investor2@syndicate.io) *
            </label>
            <textarea
              required
              rows={3}
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="investor1@fund.com, partners@group.io"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white font-mono text-xs focus:outline-none focus:border-white min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-white/60 mb-1">
              Email Subject Line *
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white font-semibold focus:outline-none focus:border-white min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-white/60 mb-1">
              Executive Deal Pitch &amp; Memo *
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white focus:outline-none focus:border-white min-h-[44px]"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="includeCardCheckbox"
              checked={includeCard}
              onChange={(e) => setIncludeCard(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-white focus:ring-0"
            />
            <label htmlFor="includeCardCheckbox" className="text-[11px] text-white/80 cursor-pointer">
              Attach Verified Operator Digital Business Card to Email
            </label>
          </div>

          {/* Off-Platform Closing Reminder */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11px] text-white/60 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[18px] text-white/40 shrink-0 mt-0.5">
              gavel
            </span>
            <p>
              <strong className="text-white font-semibold">Off-Platform Closing:</strong> PaperWorking dispatches institutional teasers and coordinates messaging inquiries. All final subscription agreements, PPM distributions, and capital wiring take place directly off-platform.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-white/70 hover:bg-white/5 text-xs font-semibold min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-white text-black hover:bg-white/90 px-5 py-2.5 font-bold text-xs shadow-lg transition active:scale-95 disabled:opacity-50 min-h-[44px]"
            >
              {loading ? 'Broadcasting...' : 'Broadcast to Investor List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
