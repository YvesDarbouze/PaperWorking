'use client';

import React, { useState } from 'react';

export interface PlaidConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConsentConfirmed: () => Promise<void> | void;
  institutionName?: string;
  isUpdateMode?: boolean;
}

export function PlaidConsentModal({
  isOpen,
  onClose,
  onConsentConfirmed,
  institutionName,
  isUpdateMode = false,
}: PlaidConsentModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!agreed) return;
    setSubmitting(true);
    setError(null);

    try {
      // Record timestamped consent in UserConsent store
      await fetch('/api/auth/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consentType: 'plaid_bank_consent',
          version: '2026-08',
          metadata: {
            institutionName: institutionName || null,
            isUpdateMode,
            plaidPolicyUrl: 'https://plaid.com/legal/#end-user-privacy-policy',
            timestamp: new Date().toISOString(),
          },
        }),
      });

      await onConsentConfirmed();
      onClose();
    } catch (err: unknown) {
      console.error('[PlaidConsentModal] Error confirming consent:', err);
      setError('Unable to record consent. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="plaid-consent-title"
      data-testid="plaid-consent-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
    >
      <div className="relative w-full max-w-[520px] rounded-2xl border border-white/15 bg-[#0f111a] p-6 shadow-2xl md:p-7 text-left space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--color-primary)]/30 bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]">
              <span className="material-symbols-outlined text-[20px]">account_balance</span>
            </div>
            <div>
              <h2 id="plaid-consent-title" className="text-base font-bold text-white tracking-tight">
                {isUpdateMode ? 'Re-authenticate Bank Connection' : 'Bank Connection & Data Notice'}
              </h2>
              <p className="text-xs text-white/60">
                Plaid integration for deal financials &amp; debt tracking
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-white/50 hover:bg-white/5 hover:text-white transition"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="space-y-3.5 text-xs leading-relaxed text-white/75">
          <p>
            PaperWorking partners with <strong>Plaid Technologies, Inc.</strong> to securely link your
            financial accounts. Before connecting, please review what data is accessed and how it is protected:
          </p>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-sm mt-0.5 shrink-0">check_circle</span>
              <span><strong>Data Accessed:</strong> Account balances, account numbers, transactions, and mortgage liabilities.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-sm mt-0.5 shrink-0">shield</span>
              <span><strong>Envelope Encryption:</strong> Access tokens are encrypted via AES-256-GCM. PaperWorking never sees or stores your banking login credentials.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-sm mt-0.5 shrink-0">delete_sweep</span>
              <span><strong>Disconnect Anytime:</strong> Disconnecting removes access tokens from our systems and purges derived data per retention rules.</span>
            </div>
          </div>

          <p>
            Your information is processed in accordance with the{' '}
            <a
              href="https://plaid.com/legal/#end-user-privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="plaid-privacy-policy-link"
              className="text-[color:var(--color-primary)] underline hover:opacity-90 inline-flex items-center gap-0.5"
            >
              <span>Plaid End User Privacy Policy</span>
              <span className="material-symbols-outlined text-[11px]">open_in_new</span>
            </a>{' '}
            and the PaperWorking Privacy Policy.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="border-t border-white/10 pt-4 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer text-xs text-white/80 select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              data-testid="plaid-consent-checkbox"
              className="mt-0.5 h-4 w-4 rounded accent-[color:var(--color-primary)] shrink-0"
            />
            <span>
              I authorize PaperWorking to connect with Plaid and agree to Plaid’s End User Privacy Policy.
            </span>
          </label>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/5 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!agreed || submitting}
              data-testid="plaid-consent-confirm-btn"
              className="rounded-xl bg-[color:var(--color-primary)] px-5 py-2 text-xs font-bold text-black transition hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100 flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  Recording Consent...
                </>
              ) : (
                'Authorize & Connect'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
