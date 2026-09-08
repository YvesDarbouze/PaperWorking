'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatCurrencyCompact } from '@/lib/format';
import { useOptionalAuth } from '@/context/AuthContext';
import { setupFocusTrap } from '@/lib/a11y/focus-trap';

export interface ExpressInterestModalProps {
  deal: {
    id: string;
    slug: string;
    name?: string;
    propertyName?: string;
    minInvestment?: number;
    fundingTarget?: number;
    target?: number;
    committedAmount?: number;
    committed?: number;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
}

export default function ExpressInterestModal({
  deal,
  isOpen,
  onClose,
  onSuccessToast,
}: ExpressInterestModalProps) {
  const router = useRouter();
  const auth = useOptionalAuth();
  const isAuthenticated = auth ? auth.authenticated && !auth.loading : true;

  const minInvestment = deal.minInvestment ?? 25000;
  const target = deal.fundingTarget ?? deal.target ?? 1000000;
  const committed = deal.committedAmount ?? deal.committed ?? 0;
  const remaining = Math.max(0, target - committed);

  const [amount, setAmount] = useState<string>(String(minInvestment));
  const [attested, setAttested] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

  const dealTitle = deal.propertyName || deal.name || 'Commercial Opportunity';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // If not authenticated, redirect to login with deep link return URL
    if (!isAuthenticated) {
      router.push(`/login?next=/marketplace/${deal.slug || deal.id}`);
      return;
    }

    const numAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid investment commitment amount.');
      return;
    }

    if (numAmount < minInvestment) {
      setError(`Minimum investment commitment is ${formatCurrency(minInvestment)}.`);
      return;
    }

    if (numAmount > remaining && remaining > 0) {
      setError(`Amount exceeds remaining allocation of ${formatCurrency(remaining)}.`);
      return;
    }

    if (!attested) {
      setError('You must attest to your accredited investor status under SEC Rule 506(c).');
      return;
    }

    setLoading(true);

    try {
      // Simulate/perform dispatch to user's Inbox and notification stream
      const inboxKey = 'paperworking_inbox_items';
      const existingItems = JSON.parse(localStorage.getItem(inboxKey) || '[]');
      const newItem = {
        id: `interest-${Date.now()}`,
        type: 'deal_interest',
        title: `Expressed Interest: ${dealTitle}`,
        body: `Soft commitment of ${formatCurrency(numAmount)} submitted. The operator will contact you with offering documents.`,
        dealId: deal.id,
        amount: numAmount,
        createdAt: new Date().toISOString(),
        unread: true,
      };
      localStorage.setItem(inboxKey, JSON.stringify([newItem, ...existingItems]));

      // Artificial small delay for polished institutional feel
      await new Promise((resolve) => setTimeout(resolve, 350));
      setSubmitted(true);
      onSuccessToast?.(`Interest of ${formatCurrency(numAmount)} registered for ${dealTitle}.`);
    } catch {
      setError('An error occurred submitting your allocation request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-testid="express-interest-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="interest-modal-title"
        className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-[#121014] p-6 shadow-2xl dropdown-entrance"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 id="interest-modal-title" className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[var(--accent)]">
                verified_user
              </span>
              Express Soft Commitment
            </h2>
            <p className="text-xs text-[#9E9DA0] mt-0.5 truncate max-w-sm">
              {dealTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#9E9DA0] hover:bg-white/10 hover:text-white"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {submitted ? (
          /* Success State */
          <div className="py-8 text-center space-y-4" data-testid="interest-success-state">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--accent)]/30 bg-[var(--accent-subtle)] text-[var(--accent)]">
              <span className="material-symbols-outlined text-3xl">check_circle</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Interest Successfully Registered</h3>
              <p className="mt-1 text-xs text-[#9E9DA0] max-w-sm mx-auto">
                A confirmation has been sent to your Inbox. The operator has been notified and
                will transmit subscription documents directly.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={onClose}
                className="w-full justify-center"
              >
                Close &amp; Return to Deal
              </Button>
            </div>
          </div>
        ) : (
          /* Commitment Form */
          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
            {/* Inline Error */}
            {error && (
              <div
                data-testid="interest-form-error"
                className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px] text-red-400">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Target & Min Context */}
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs">
              <div>
                <span className="text-[#9E9DA0] block text-[10px] uppercase font-bold">Min Investment</span>
                <span className="font-mono font-bold text-white mt-0.5 block">
                  {formatCurrency(minInvestment)}
                </span>
              </div>
              <div>
                <span className="text-[#9E9DA0] block text-[10px] uppercase font-bold">Remaining Allocation</span>
                <span className="font-mono font-bold text-[var(--accent)] mt-0.5 block">
                  {formatCurrencyCompact(remaining)}
                </span>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-1.5">
              <label htmlFor="commitment-amount" className="block text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">
                Indicated Investment Amount ($)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-[#9E9DA0]">
                  $
                </span>
                <input
                  id="commitment-amount"
                  data-testid="commitment-amount-input"
                  type="number"
                  step="1000"
                  min={minInvestment}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  placeholder="e.g. 50000"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] py-2.5 pl-8 pr-4 font-mono text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            {/* Accreditation Attestation (Strict SEC Rule 506(c)) */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="accreditation-checkbox"
                  checked={attested}
                  onChange={(e) => setAttested(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/10 text-[var(--accent)] focus:ring-[var(--accent)] accent-[var(--accent)]"
                />
                <span className="text-xs text-[#fdfffc]/90 leading-snug">
                  I attest that I am an <strong>Accredited Investor</strong> under Rule 506(c) of SEC
                  Regulation D (net worth &gt; $1M excluding primary residence, or income &gt; $200k/$300k).
                </span>
              </label>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label htmlFor="commitment-notes" className="block text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">
                Notes or Entity Name (Optional)
              </label>
              <textarea
                id="commitment-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g., Investing via Family Trust or LLC"
                className="w-full rounded-xl border border-white/15 bg-white/[0.04] p-3 text-xs text-white placeholder:text-white/30 outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* Action Cluster: Tertiary Cancel + Primary Submit */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <Button
                type="button"
                variant="tertiary"
                size="md"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={loading}
                data-testid="submit-interest-btn"
                className="min-w-[150px] justify-center"
              >
                {loading ? 'Submitting…' : 'Submit Interest'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
