'use client';

import { useEffect, useState } from 'react';

export interface QuoteVendor {
  id: string;
  companyName: string;
  type?: string;
  category?: string;
}

interface VendorRequestModalProps {
  isOpen: boolean;
  vendor: QuoteVendor | null;
  onClose: () => void;
}

export function VendorRequestModal({ isOpen, vendor, onClose }: VendorRequestModalProps) {
  const [message, setMessage] = useState('');
  const [projectLabel, setProjectLabel] = useState('');
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMessage('');
      setProjectLabel('');
      setAgree(false);
      setSubmitting(false);
      setDone(false);
      setError(null);
    }
  }, [isOpen, vendor?.id]);

  if (!isOpen || !vendor) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectLabel.trim()) {
      setError('Project name is required to request a quote.');
      return;
    }
    if (!agree) {
      setError('You must agree to the Terms of Service.');
      return;
    }
    setSubmitting(true);
    setError(null);
    // Seed-mode acknowledgement — full assignVendor flow lands with Firebase wiring.
    await new Promise((r) => setTimeout(r, 400));
    setSubmitting(false);
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Request vendor quote"
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#121014] p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#fdfffc]">Request Quote</h2>
            <p className="mt-1 text-sm text-white/55">
              {vendor.companyName}
              {vendor.type || vendor.category ? ` · ${vendor.type || vendor.category}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 p-1.5 text-white/50 hover:text-white"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {done ? (
          <div className="space-y-4">
            <p className="text-sm text-emerald-300">
              Quote request recorded for {vendor.companyName}. They will follow up outside the platform.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-[#fdfffc] py-2.5 text-sm font-bold text-[#0d0a0b]"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
                Project
              </span>
              <input
                value={projectLabel}
                onChange={(e) => setProjectLabel(e.target.value)}
                placeholder="e.g. Elm Street Flip"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/25"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
                Message
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Describe scope, timeline, and budget…"
                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/25"
              />
            </label>
            <label className="flex items-start gap-2 text-xs text-white/60">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I agree that PaperWorking only facilitates introductions; all engagement is between the
                parties.
              </span>
            </label>
            {error ? <p className="text-xs text-red-300">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#fdfffc] py-2.5 text-sm font-bold text-[#0d0a0b] disabled:opacity-60"
            >
              {submitting ? (
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">send</span>
              )}
              Send Request
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
