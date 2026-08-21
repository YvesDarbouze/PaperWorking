'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  VENDOR_REQUEST_FILTERS,
  formatVendorFee,
  type VendorRequestFilter,
} from '@/lib/vendor-portal/seed-data';

interface VendorRequest {
  id: string;
  projectId: string;
  dealName: string;
  location: string;
  dealPhase: string;
  investor: string;
  status: string;
  type: string;
  message?: string;
  requestedAt: string;
  quotedFee?: number;
}

export default function VendorRequestsPanel() {
  const [requests, setRequests] = useState<VendorRequest[]>([]);
  const [filter, setFilter] = useState<VendorRequestFilter>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quoteTarget, setQuoteTarget] = useState<VendorRequest | null>(null);
  const [quotedFee, setQuotedFee] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/vendor-portal/requests', {
        credentials: 'include',
        cache: 'no-store',
      });
      const body = (await response.json()) as { success?: boolean; requests?: VendorRequest[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Failed to load requests');
      setRequests(body.requests ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filtered = useMemo(() => {
    if (filter === 'All') return requests;
    return requests.filter((request) => request.status === filter);
  }, [filter, requests]);

  const stats = useMemo(() => {
    const submitted = requests.filter((request) =>
      ['QUOTED', 'ACCEPTED', 'COMPLETED'].includes(request.status),
    ).length;
    const accepted = requests.filter((request) =>
      ['ACCEPTED', 'COMPLETED'].includes(request.status),
    ).length;
    return {
      leadsReceived: requests.length,
      bidsSubmitted: submitted,
      winRate: submitted > 0 ? Number(((accepted / submitted) * 100).toFixed(1)) : 0,
      pendingCount: requests.filter((request) => request.status === 'PENDING').length,
    };
  }, [requests]);

  const submitQuote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!quoteTarget) return;
    const fee = Number(quotedFee);
    if (!Number.isFinite(fee) || fee <= 0) {
      setError('Enter a valid quoted fee.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/vendor-portal/requests', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: quoteTarget.id,
          projectId: quoteTarget.projectId,
          quotedFee: fee,
          message: quoteMessage,
          status: 'QUOTED',
        }),
      });
      const body = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Failed to submit quote');
      setQuoteTarget(null);
      setQuotedFee('');
      setQuoteMessage('');
      await loadRequests();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to submit quote');
    } finally {
      setSubmitting(false);
    }
  };

  const declineRequest = async (request: VendorRequest) => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/vendor-portal/requests', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.id,
          projectId: request.projectId,
          status: 'DECLINED',
        }),
      });
      const body = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Failed to decline request');
      await loadRequests();
    } catch (declineError) {
      setError(declineError instanceof Error ? declineError.message : 'Failed to decline request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-8 px-4 py-5 sm:px-5 sm:py-6 lg:px-6 xl:px-8">
      <section>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
          Vendor requests
        </p>
        <h2 className="text-3xl font-semibold tracking-[-0.02em]">Quote inbox</h2>
        <p className="mt-2 max-w-[60ch] text-sm text-white/65">
          Loaded via `handleVendorPortalRequestsGet` with quote/decline updates through `handleVendorPortalRequestsPut`.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Leads received', value: String(stats.leadsReceived) },
          { label: 'Bids submitted', value: String(stats.bidsSubmitted) },
          { label: 'Win rate', value: `${stats.winRate}%` },
          { label: 'Pending', value: String(stats.pendingCount) },
        ].map((item) => (
          <article key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-white/45">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="flex flex-wrap gap-2">
        {VENDOR_REQUEST_FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={`rounded-full px-4 py-2 text-sm transition ${
              filter === option
                ? 'bg-white text-black'
                : 'border border-white/15 text-white/70 hover:bg-white/5'
            }`}
          >
            {option}
          </button>
        ))}
      </section>

      {loading ? (
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8 text-sm text-white/60">
          Loading vendor requests…
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {!loading ? (
        <section className="space-y-4">
          {filtered.map((request) => (
            <article key={request.id} className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.07em] text-white/45">{request.type}</p>
                  <h3 className="mt-1 text-lg font-semibold">{request.dealName}</h3>
                  <p className="mt-1 text-sm text-white/60">{request.location}</p>
                  <p className="mt-2 text-sm text-white/70">{request.message}</p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs">{request.status}</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/55">
                <span>Investor: {request.investor}</span>
                <span>Phase: {request.dealPhase}</span>
                <span>{new Date(request.requestedAt).toLocaleDateString()}</span>
                {request.quotedFee ? <span>Quote: {formatVendorFee(request.quotedFee)}</span> : null}
              </div>

              {request.status === 'PENDING' ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQuoteTarget(request);
                      setQuotedFee('');
                      setQuoteMessage(request.message ?? '');
                    }}
                    className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
                  >
                    Submit quote
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => declineRequest(request)}
                    className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/75 hover:bg-white/5 disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-8 text-sm text-white/60">
          No requests in this filter.
        </div>
      ) : null}

      {quoteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={submitQuote}
            className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-[#12151a] p-6"
          >
            <h3 className="text-lg font-semibold">Submit quote — {quoteTarget.dealName}</h3>
            <label className="block text-sm">
              <span className="text-white/65">Quoted fee (USD)</span>
              <input
                value={quotedFee}
                onChange={(event) => setQuotedFee(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-white/65">Message</span>
              <textarea
                value={quoteMessage}
                onChange={(event) => setQuoteMessage(event.target.value)}
                className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setQuoteTarget(null)}
                className="rounded-full border border-white/15 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-white px-4 py-2 text-sm text-black disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Submit quote'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
