'use client';

import { useEffect, useState } from 'react';
import { X, CircleNotch, PaperPlaneTilt } from '@phosphor-icons/react';

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
    if (!vendor) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: vendor.id,
          projectLabel: projectLabel.trim(),
          message: message.trim(),
        }),
      });
      if (!res.ok) {
        let apiError = '';
        try {
          const data = await res.json();
          if (data && typeof data.error === 'string') apiError = data.error;
        } catch {
          // Non-JSON error body; fall through to the generic message.
        }
        setError(apiError || 'Quote request could not be sent. Please try again.');
        return;
      }
      setDone(true);
    } catch {
      setError('Quote request could not be sent. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
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
        className="relative w-full max-w-md rounded-none border border-neutral-800 bg-neutral-950 p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Request Quote</h2>
            <p className="mt-1 text-sm text-neutral-400">
              {vendor.companyName}
              {vendor.type || vendor.category ? ` · ${vendor.type || vendor.category}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-none border border-neutral-800 text-neutral-400 hover:text-white transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="space-y-4">
            <p className="text-sm text-neutral-300">
              Quote request recorded for {vendor.companyName}. They will follow up outside the platform.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-none bg-white py-2.5 text-sm font-medium text-neutral-950 hover:bg-neutral-200 min-h-[44px]"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                Project
              </span>
              <input
                value={projectLabel}
                onChange={(e) => setProjectLabel(e.target.value)}
                placeholder="e.g. Elm Street Flip"
                className="w-full rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-base md:text-sm text-white outline-none placeholder:text-neutral-500 focus:border-neutral-500 min-h-[44px]"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                Message
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Describe scope, timeline, and budget…"
                className="w-full resize-none rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-base md:text-sm text-white outline-none placeholder:text-neutral-500 focus:border-neutral-500"
              />
            </label>
            <label className="flex items-start gap-2 text-xs text-neutral-400 min-h-[32px] cursor-pointer">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-0.5 rounded-none border-neutral-700 bg-neutral-900 text-neutral-100 accent-neutral-100 focus:outline-none h-4 w-4"
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
              className="flex w-full items-center justify-center gap-2 rounded-none bg-white py-2.5 text-sm font-medium text-neutral-950 hover:bg-neutral-200 disabled:opacity-60 min-h-[44px]"
            >
              {submitting ? (
                <CircleNotch className="h-4 w-4 animate-spin" />
              ) : (
                <PaperPlaneTilt className="h-4 w-4" />
              )}
              Send Request
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
