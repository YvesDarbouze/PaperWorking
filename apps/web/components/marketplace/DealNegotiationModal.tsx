'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { setupFocusTrap } from '@/lib/a11y/focus-trap';
import { formatCurrencyCompact, formatPercent } from '@/lib/format';

interface DealNegotiationModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string;
  dealTitle: string;
  dealAddress: string;
  operatorName?: string;
  targetIrr?: number;
  minInvestment?: number;
}

export default function DealNegotiationModal({
  isOpen,
  onClose,
  dealId,
  dealTitle,
  dealAddress,
  operatorName = 'Operating Partner',
  targetIrr,
  minInvestment = 25000,
}: DealNegotiationModalProps) {
  const [ticketAmount, setTicketAmount] = useState<number>(minInvestment);
  const [message, setMessage] = useState(
    `Hello, we are interested in discussing co-investment terms for ${dealTitle}. We are evaluating a $${minInvestment.toLocaleString()} commitment and would like to review the loan covenants and waterfall distribution schedule.`,
  );
  const [senderEmail, setSenderEmail] = useState('investor@paperworking.test');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successThreadId, setSuccessThreadId] = useState<string | null>(null);

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

    try {
      const res = await fetch('/api/deals/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId,
          senderEmail,
          content: `[Proposed Ticket: $${ticketAmount.toLocaleString()}] ${message}`,
          source: 'platform',
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to send negotiation inquiry. Please try again.');
      }

      const data = await res.json();
      setSuccessThreadId(data.threadId || `thread-deal-${Date.now()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send inquiry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deal-negotiation-title"
      data-testid="deal-negotiation-modal"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl border-t sm:border border-white/15 bg-[#0f0e13] p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
          <div>
            <h2 id="deal-negotiation-title" className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-white">
                forum
              </span>
              Negotiate in Messages
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              Initiate a confidential deal negotiation thread with <strong className="text-white">{operatorName}</strong>.
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

        {successThreadId ? (
          <div className="py-6 space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <span className="material-symbols-outlined text-[24px]">mark_email_read</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Negotiation Thread Started</h3>
              <p className="mt-1.5 text-xs text-white/60 max-w-sm mx-auto">
                Your message has been dispatched to {operatorName}. A private negotiation thread has been opened in your Unified Inbox.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11px] text-white/50 text-left">
              <p>
                <strong className="text-white">Next Steps:</strong> Reply to terms directly in Messages. When terms are reached, formal subscription documents, entity onboarding, and capital closing happen off-platform.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/dashboard/inbox"
                className="w-full sm:w-auto rounded-xl bg-white text-black hover:bg-white/90 px-5 py-2.5 font-bold text-xs shadow-lg transition active:scale-95 min-h-[44px] flex items-center justify-center gap-1.5"
              >
                <span>Open in Unified Inbox</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold text-white/70 hover:text-white min-h-[44px]"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="overflow-y-auto py-3 space-y-3.5 text-xs pr-1">
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-red-300">
                {error}
              </div>
            )}

            {/* Deal Snapshot Header */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-white text-xs">{dealTitle}</p>
                <p className="text-[11px] text-white/50">{dealAddress}</p>
              </div>
              {targetIrr ? (
                <div className="text-right">
                  <span className="text-[10px] uppercase text-white/40 block">Target IRR</span>
                  <span className="font-mono font-bold text-white text-xs block">
                    {formatPercent(targetIrr)}
                  </span>
                </div>
              ) : null}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-white/60 mb-1">
                Target Commitment / Ticket Sizing ($) *
              </label>
              <input
                type="number"
                required
                min={1000}
                value={ticketAmount}
                onChange={(e) => setTicketAmount(Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white font-mono focus:outline-none focus:border-white min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-white/60 mb-1">
                Your Email Address *
              </label>
              <input
                type="email"
                required
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white focus:outline-none focus:border-white min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-white/60 mb-1">
                Negotiation Message &amp; Due Diligence Terms *
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white focus:outline-none focus:border-white min-h-[44px]"
              />
            </div>

            {/* Off-Platform Closing Notice */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11px] text-white/60 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-white/40 shrink-0 mt-0.5">
                gavel
              </span>
              <p>
                <strong className="text-white font-semibold">Off-Platform Closing:</strong> PaperWorking provides secure direct messaging to negotiate terms. The final closing of the relationship, partnership agreements, and capital funding happens directly between counterparties outside of PaperWorking.
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
                {loading ? 'Starting Thread...' : 'Start Negotiation in Messages'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
