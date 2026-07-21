'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { proposeNegotiationTerms } from '@/actions/negotiations';
import posthog from 'posthog-js';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════
   RespondToTermsButton (AQ-28 & AQ-29)
   
   "Respond to Terms" CTA with live equity share computation,
   subscription gate, counter terms support, and non-binding
   acknowledgment checks.
   ═══════════════════════════════════════════════════════ */

interface RespondToTermsButtonProps {
  listingId: string;
  projectId: string;
  minTicketCents?: number;
  fundingTargetCents?: number;
  equityOfferedPct?: number;
  className?: string;
}

export default function RespondToTermsButton({
  listingId,
  projectId,
  minTicketCents,
  fundingTargetCents,
  equityOfferedPct,
  className = '',
}: RespondToTermsButtonProps) {
  const { user, profile } = useAuth();
  
  const [showModal, setShowModal] = useState(false);
  const [isCounter, setIsCounter] = useState(false);
  
  const [amount, setAmount] = useState('');
  const [customEquity, setCustomEquity] = useState('');
  const [message, setMessage] = useState('');
  const [nonBindingAcknowledge, setNonBindingAcknowledge] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const minDollars = minTicketCents ? minTicketCents / 100 : 0;
  const targetDollars = fundingTargetCents ? fundingTargetCents / 100 : 0;
  const offeredPct = equityOfferedPct ?? 0;

  // Subscription check
  const isSubscriber = useMemo(() => {
    if (!profile) return false;
    const plan = profile.subscriptionPlan as string | undefined;
    const status = profile.subscriptionStatus as string | undefined;
    const isVendor = profile.accountType === 'vendor';
    return (
      plan &&
      plan !== 'None' &&
      plan !== 'Vendor Network' &&
      status === 'active' &&
      !isVendor
    );
  }, [profile]);

  // Compute live equity share for Agree path
  const computedEquityShare = useMemo(() => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0 || targetDollars <= 0) return 0;
    return Number(((amt / targetDollars) * offeredPct).toFixed(4));
  }, [amount, targetDollars, offeredPct]);

  const handleSubmit = async () => {
    if (!user || !amount) return;
    const amountCents = Math.round(parseFloat(amount) * 100);

    if (minTicketCents && amountCents < minTicketCents) {
      return;
    }

    if (!nonBindingAcknowledge) {
      return;
    }

    setSubmitting(true);
    try {
      const idToken = await user.getIdToken();
      const equityPct = isCounter ? parseFloat(customEquity) : computedEquityShare;
      
      await proposeNegotiationTerms(idToken, listingId, {
        contributionCents: amountCents,
        equityPct: isNaN(equityPct) ? undefined : equityPct,
        isCounter,
        note: message || undefined,
      });

      setSubmitted(true);
      setShowModal(false);

      try {
        posthog.capture('deal_terms_response', { listingId, amountCents, isCounter });
      } catch { /* telemetry non-fatal */ }
    } catch (err) {
      console.error('Propose terms failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        className={`
          inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
          bg-[var(--color-positive)]/10 text-[var(--color-positive)] border border-[var(--color-positive)]/25
          ${className}
        `}
      >
        <span className="material-symbols-outlined text-lg">check_circle</span>
        Negotiation Thread Opened
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`
          luminous-button inline-flex items-center gap-2
          px-4 py-2.5 rounded-xl text-sm font-semibold
          transition-all duration-200
          ${className}
        `}
      >
        <span className="material-symbols-outlined text-lg">handshake</span>
        Respond to Terms
      </button>

      {/* Modal Container */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          {/* Modal Card */}
          <div className="relative glass-card rounded-2xl border border-pw-border p-6 w-full max-w-md mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left">
            
            {/* 1. Subscribe Gate Modal */}
            {!isSubscriber ? (
              <div className="space-y-6 py-2">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 flex items-center justify-center text-[var(--color-error)]">
                    <span className="material-symbols-outlined text-2xl">lock</span>
                  </div>
                  <h3 className="text-lg font-bold text-[var(--color-on-surface)]">
                    Subscription Required
                  </h3>
                  <p className="text-sm text-[var(--color-muted)]">
                    Reviewing and responding to deal terms is restricted to active individual and team subscribers. Vendor accounts are excluded.
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setShowModal(false)}
                    className="w-full text-center luminous-button py-2.5 rounded-xl text-sm font-semibold block transition-all"
                  >
                    Manage Subscription
                  </Link>
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-full text-center py-2.5 rounded-xl border border-pw-border text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-on-surface)] transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // 2. Active Subscriber Form
              <div>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-[var(--color-on-surface)]">
                      Respond to Terms
                    </h3>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">
                      Review terms and agree or propose counter terms.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-[var(--color-muted)] hover:text-[var(--color-on-surface)] transition-colors p-1"
                  >
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>

                {/* Segmented control for Agree vs Counter */}
                <div className="grid grid-cols-2 p-1 bg-[var(--color-background)]/50 border border-pw-border rounded-xl mb-4">
                  <button
                    type="button"
                    onClick={() => setIsCounter(false)}
                    className={`py-1.5 rounded-lg text-xs font-semibold uppercase tracking-[0.05em] transition-all ${
                      !isCounter
                        ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-bold'
                        : 'text-[var(--color-muted)] hover:text-[var(--color-on-surface)]'
                    }`}
                  >
                    Agree to Terms
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCounter(true)}
                    className={`py-1.5 rounded-lg text-xs font-semibold uppercase tracking-[0.05em] transition-all ${
                      isCounter
                        ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-bold'
                        : 'text-[var(--color-muted)] hover:text-[var(--color-on-surface)]'
                    }`}
                  >
                    Propose Counter
                  </button>
                </div>

                {/* Main Fields */}
                <div className="space-y-4 mb-6">
                  {/* Contribution */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-1.5">
                      Contribution Amount ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] font-mono text-sm">
                        $
                      </span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min={minDollars || 0}
                        max={targetDollars || undefined}
                        step="1000"
                        placeholder={minDollars ? `Min: ${minDollars.toLocaleString()}` : 'Enter amount'}
                        className="glass-input w-full pl-7 pr-4 py-2.5 rounded-xl text-sm font-mono tabular-nums"
                      />
                    </div>
                    {minTicketCents && (
                      <p className="text-[10px] text-[var(--color-muted)] mt-1">
                        Minimum ticket: ${minDollars.toLocaleString()}
                        {targetDollars > 0 && ` · Target: $${targetDollars.toLocaleString()}`}
                      </p>
                    )}
                  </div>

                  {/* Live Equity Calculation / Custom Equity */}
                  {!isCounter ? (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-1">
                        Computed Equity Share (%)
                      </label>
                      <div className="bg-[var(--color-background)]/30 border border-pw-border p-2.5 rounded-xl font-mono text-sm text-[var(--color-primary)] font-semibold flex justify-between items-center">
                        <span>{computedEquityShare.toFixed(4)}%</span>
                        <span className="text-[10px] uppercase text-[var(--color-muted)] font-normal tracking-[0.05em]">
                          Based on {offeredPct}% pool
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-1.5">
                        Proposed Equity Share (%)
                      </label>
                      <input
                        type="number"
                        value={customEquity}
                        onChange={(e) => setCustomEquity(e.target.value)}
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="e.g. 5.5"
                        className="glass-input w-full px-4 py-2.5 rounded-xl text-sm font-mono"
                      />
                    </div>
                  )}

                  {/* Message note */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-1.5">
                      Proposed Note <span className="font-normal normal-case tracking-normal">(optional)</span>
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      placeholder={isCounter ? "Explain your counter-offer terms..." : "Introduce yourself and express interest..."}
                      className="glass-input w-full px-4 py-2.5 rounded-xl text-sm resize-none"
                    />
                  </div>

                  {/* Non-Binding Acknowledgment Checkbox */}
                  <div className="flex items-start gap-2.5 pt-1.5">
                    <input
                      type="checkbox"
                      id="non-binding-check"
                      checked={nonBindingAcknowledge}
                      onChange={(e) => setNonBindingAcknowledge(e.target.checked)}
                      className="mt-1 flex-shrink-0 cursor-pointer"
                    />
                    <label
                      htmlFor="non-binding-check"
                      className="text-[10px] leading-tight text-[var(--color-muted)] cursor-pointer select-none"
                    >
                      I acknowledge that this response is **explicitly non-binding**. Formal legal execution of investment documents occurs entirely outside of the PaperWorking platform.
                    </label>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-pw-border text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-on-surface)] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !amount || !nonBindingAcknowledge || (isCounter && !customEquity)}
                    className="flex-1 luminous-button px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : isCounter ? 'Propose Counter' : 'Agree to Terms'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
