'use client';

import { useState } from 'react';
import { X, CheckCircle, CircleNotch, PaperPlaneTilt } from '@phosphor-icons/react';
import { bffFetch } from '@/lib/api/bff-fetch';

export interface DealBroadcastModalProps {
  dealId: string;
  dealName: string;
  dealAddress: string;
  dealRoi: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function DealBroadcastModal({
  dealId,
  dealName,
  dealAddress,
  dealRoi,
  isOpen,
  onClose,
}: DealBroadcastModalProps) {
  const [emailsText, setEmailsText] = useState('');
  const [subject, setSubject] = useState(`Investment Opportunity: ${dealName}`);
  const [message, setMessage] = useState(
    `I'm sharing the underwriting analysis for ${dealName} (${dealAddress}) on PaperWorking. Projected ROI: ${dealRoi}%. Review the details and gauge co-investment interest.`,
  );
  const [includeBusinessCard, setIncludeBusinessCard] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ dispatchedCount: number } | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<string>('not_configured');

  if (!isOpen) return null;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const recipientEmails = emailsText
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes('@'));

    if (recipientEmails.length === 0) {
      setError('Please provide at least one valid recipient email address.');
      setLoading(false);
      return;
    }

    try {
      const response = await bffFetch('/api/deals/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId,
          recipientEmails,
          subject,
          message,
          includeBusinessCard,
        }),
      });

      const body = (await response.json()) as {
        success?: boolean;
        dispatchedCount?: number;
        error?: string;
      };

      if (!response.ok || !body.success) {
        throw new Error(body.error ?? 'Failed to send broadcast');
      }

      setSuccessResult({ dispatchedCount: body.dispatchedCount ?? recipientEmails.length });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dispatch broadcast');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="broadcast-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-lg rounded-none border border-white/10 bg-[#16141a] p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-white/50 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Close broadcast modal"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 id="broadcast-title" className="text-lg font-semibold text-white">
          Share Analysis &amp; Broadcast Deal
        </h2>
        <p className="mt-1 text-xs text-white/60">
          Broadcast underwriting metrics to external partners and soft-equity co-investors.
        </p>

        {successResult ? (
          <div className="mt-6 space-y-4 rounded-none border border-[var(--accent)]/30 bg-[var(--accent-subtle)] p-5 text-center">
            <CheckCircle className="h-8 w-8 text-[var(--accent)] mx-auto" />
            <p className="text-sm font-semibold text-white">
              Broadcast saved — invitations created for {successResult.dispatchedCount} recipient
              {successResult.dispatchedCount === 1 ? '' : 's'}.
            </p>
            {deliveryStatus === 'not_configured' || deliveryStatus === 'mock' ? (
              <p className="text-xs text-white/70">
                Email delivery is not configured. Invitations are available in the PaperWorking
                inbox.
              </p>
            ) : (
              <p className="text-xs text-white/70">Delivery status: {deliveryStatus}.</p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="mt-2 inline-flex items-center justify-center rounded-none bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[#0a0a0f] min-h-[44px]"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="mt-5 space-y-4">
            {error ? (
              <div className="rounded-none border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
                {error}
              </div>
            ) : null}

            <div>
              <label htmlFor="recipient-emails" className="block text-xs font-medium text-white/70">
                Recipient Emails (comma or line separated)
              </label>
              <textarea
                id="recipient-emails"
                value={emailsText}
                onChange={(e) => setEmailsText(e.target.value)}
                placeholder="partner@investor.com, capital@fund.com"
                rows={2}
                required
                className="mt-1 w-full rounded-none border border-white/10 bg-white/[0.04] p-3 text-base md:text-xs text-white placeholder:text-white/30 focus:border-[var(--accent)] focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="broadcast-subject" className="block text-xs font-medium text-white/70">
                Subject
              </label>
              <input
                id="broadcast-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="mt-1 w-full rounded-none border border-white/10 bg-white/[0.04] px-3 py-2 text-base md:text-xs text-white placeholder:text-white/30 focus:border-[var(--accent)] focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="broadcast-message" className="block text-xs font-medium text-white/70">
                Custom Note
              </label>
              <textarea
                id="broadcast-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-none border border-white/10 bg-white/[0.04] p-3 text-base md:text-xs text-white placeholder:text-white/30 focus:border-[var(--accent)] focus:outline-none min-h-[44px]"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer min-h-[44px]">
              <input
                type="checkbox"
                checked={includeBusinessCard}
                onChange={(e) => setIncludeBusinessCard(e.target.checked)}
                className="rounded-none border-white/20 bg-white/10 text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              Include digital business card &amp; contact info
            </label>

            <div className="mt-6 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-none border border-white/10 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/5 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-none bg-[var(--accent)] px-5 py-2 text-xs font-semibold text-[#0a0a0f] hover:brightness-110 disabled:opacity-50 min-h-[44px]"
              >
                {loading ? (
                  <>
                    <CircleNotch className="h-3.5 w-3.5 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <PaperPlaneTilt className="h-3.5 w-3.5" />
                    Share Analysis
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
