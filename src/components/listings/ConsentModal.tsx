'use client';

import React, { useState } from 'react';

/* ═══════════════════════════════════════════════════════
   ConsentModal (AQ-27)
   
   Post-follow modal asking for email + in-app notification
   consent. Consent is SEPARATE from the follow action —
   user follows first, then gets this ask.
   ═══════════════════════════════════════════════════════ */

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (consent: { emailConsent: boolean; inAppConsent: boolean }) => Promise<void>;
  /** What are they following? (displayed in UI) */
  followTarget: string;
}

export default function ConsentModal({ isOpen, onClose, onSubmit, followTarget }: ConsentModalProps) {
  const [emailConsent, setEmailConsent] = useState(false);
  const [inAppConsent, setInAppConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({ emailConsent, inAppConsent });
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative glass-card rounded-2xl border border-pw-border p-6 w-full max-w-md mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[var(--color-primary)] text-xl">
                notifications
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--color-on-surface)]">
                Stay Updated
              </h3>
              <p className="text-xs text-[var(--color-muted)]">
                Following {followTarget}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-muted)] hover:text-[var(--color-on-surface)] transition-colors p-1"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Consent options */}
        <div className="space-y-3 mb-6">
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            Choose how you&apos;d like to receive updates about this {followTarget.includes('investor') ? 'investor' : 'deal'}:
          </p>

          {/* Email consent */}
          <label className="flex items-center gap-3 p-3 rounded-xl border border-pw-border hover:border-[var(--color-primary)]/30 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={emailConsent}
              onChange={(e) => setEmailConsent(e.target.checked)}
              className="w-4 h-4 rounded border-pw-border text-[var(--color-primary)] focus:ring-[var(--color-primary)]/30"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-[var(--color-muted)]">
                  email
                </span>
                <span className="text-sm font-medium text-[var(--color-on-surface)]">
                  Email notifications
                </span>
              </div>
              <p className="text-xs text-[var(--color-muted)] mt-0.5 ml-6">
                Receive updates about this deal via email
              </p>
            </div>
          </label>

          {/* In-app consent */}
          <label className="flex items-center gap-3 p-3 rounded-xl border border-pw-border hover:border-[var(--color-primary)]/30 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={inAppConsent}
              onChange={(e) => setInAppConsent(e.target.checked)}
              className="w-4 h-4 rounded border-pw-border text-[var(--color-primary)] focus:ring-[var(--color-primary)]/30"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-[var(--color-muted)]">
                  inbox
                </span>
                <span className="text-sm font-medium text-[var(--color-on-surface)]">
                  In-app notifications
                </span>
              </div>
              <p className="text-xs text-[var(--color-muted)] mt-0.5 ml-6">
                See updates in your PaperWorking inbox
              </p>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-pw-border text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-on-surface)] hover:border-[var(--color-on-surface)]/20 transition-all"
          >
            Skip for now
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 luminous-button px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>

        <p className="text-[10px] text-[var(--color-muted)]/50 text-center mt-3">
          You can change these preferences anytime from your inbox settings.
        </p>
      </div>
    </div>
  );
}
