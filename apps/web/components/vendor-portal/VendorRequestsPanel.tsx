'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Storefront, CheckCircle, X } from '@phosphor-icons/react';
import { bffFetch } from '@/lib/api/bff-fetch';
import { CANONICAL_VENDOR_PROFESSIONS } from '@/lib/marketplace/vendor-professions';
import { SEED_PROJECTS } from '@/lib/projects/seed-data';
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

function extractApiError(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const record = body as Record<string, unknown>;
  if (typeof record.error === 'string' && record.error.trim()) return record.error;
  if (
    record.error &&
    typeof record.error === 'object' &&
    typeof (record.error as Record<string, unknown>).message === 'string'
  ) {
    return String((record.error as Record<string, unknown>).message);
  }
  if (typeof record.message === 'string' && record.message.trim()) return record.message;
  return fallback;
}

export default function VendorRequestsPanel() {
  const [requests, setRequests] = useState<VendorRequest[]>([]);
  const [filter, setFilter] = useState<VendorRequestFilter>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [quoteTarget, setQuoteTarget] = useState<VendorRequest | null>(null);
  const [quotedFee, setQuotedFee] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Submit RFP / Quote Request modal state
  const [isRfpModalOpen, setIsRfpModalOpen] = useState(false);
  const [rfpProjectId, setRfpProjectId] = useState(SEED_PROJECTS[0]?.id || 'deal-1');
  const [rfpTradeType, setRfpTradeType] = useState<string>(
    CANONICAL_VENDOR_PROFESSIONS[0] || 'General Contractor',
  );
  const [rfpLocation, setRfpLocation] = useState(
    SEED_PROJECTS[0]?.address || 'Austin, TX',
  );
  const [rfpMessage, setRfpMessage] = useState('');
  const [rfpSubmitting, setRfpSubmitting] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await bffFetch('/api/vendor-portal/requests', {
        cache: 'no-store',
      });
      const body = (await response.json()) as {
        success?: boolean;
        requests?: VendorRequest[];
        error?: unknown;
      };
      if (!response.ok) throw new Error(extractApiError(body, 'Failed to load requests'));
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

  const handleCreateRfpRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedMsg = rfpMessage.trim();
    if (!trimmedMsg) {
      setError('Please enter a scope of work or message for the RFP / quote request.');
      return;
    }

    const selectedProject = SEED_PROJECTS.find((p) => p.id === rfpProjectId);
    const projectLabel = selectedProject?.propertyName || 'General RFP';

    setRfpSubmitting(true);
    setError(null);
    setSuccessBanner(null);
    try {
      const response = await bffFetch('/api/vendor-portal/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: rfpProjectId,
          projectLabel,
          type: rfpTradeType,
          location: rfpLocation.trim() || selectedProject?.address || 'Austin, TX',
          message: trimmedMsg,
        }),
      });
      const body = (await response.json()) as {
        success?: boolean;
        request?: VendorRequest;
        error?: unknown;
      };
      if (!response.ok) {
        throw new Error(extractApiError(body, 'Failed to submit RFP / quote request'));
      }
      if (body.request) {
        setRequests((prev) => [body.request!, ...prev]);
      } else {
        await loadRequests();
      }
      setIsRfpModalOpen(false);
      setRfpMessage('');
      setSuccessBanner(`RFP / Quote Request submitted for ${projectLabel} (${rfpTradeType}).`);
    } catch (rfpError) {
      setError(
        rfpError instanceof Error ? rfpError.message : 'Failed to submit RFP / quote request',
      );
    } finally {
      setRfpSubmitting(false);
    }
  };

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
      const response = await bffFetch('/api/vendor-portal/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: quoteTarget.id,
          projectId: quoteTarget.projectId,
          quotedFee: fee,
          message: quoteMessage,
          status: 'QUOTED',
        }),
      });
      const body = (await response.json()) as { success?: boolean; error?: unknown };
      if (!response.ok) throw new Error(extractApiError(body, 'Failed to submit quote'));
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
      const response = await bffFetch('/api/vendor-portal/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.id,
          projectId: request.projectId,
          status: 'DECLINED',
        }),
      });
      const body = (await response.json()) as { success?: boolean; error?: unknown };
      if (!response.ok) throw new Error(extractApiError(body, 'Failed to decline request'));
      await loadRequests();
    } catch (declineError) {
      setError(declineError instanceof Error ? declineError.message : 'Failed to decline request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-8 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
            Vendor requests & RFP dispatch
          </p>
          <h2 className="text-3xl font-semibold tracking-[-0.02em]">Quote inbox</h2>
          <p className="mt-2 max-w-[60ch] text-base text-white/65">
            Submit RFPs and quote requests for your active acquisitions, review incoming bids, and manage vendor engagements in one central inbox.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/marketplace"
            data-testid="browse-vendor-directory-link"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-none border border-white/15 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10"
          >
            <Storefront className="h-4 w-4" />
            <span>Browse Vendor Directory</span>
          </Link>
          <button
            type="button"
            data-testid="open-submit-rfp-modal-btn"
            onClick={() => {
              setError(null);
              setIsRfpModalOpen(true);
            }}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-none bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            <Plus className="h-4 w-4" weight="bold" />
            <span>Submit RFP / Quote Request</span>
          </button>
        </div>
      </section>

      {successBanner ? (
        <div
          data-testid="rfp-submitted-toast"
          className="flex items-center justify-between gap-3 rounded-none border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-100"
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" weight="fill" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-emerald-200 hover:text-white"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Leads received', value: String(stats.leadsReceived) },
          { label: 'Bids submitted', value: String(stats.bidsSubmitted) },
          { label: 'Win rate', value: `${stats.winRate}%` },
          { label: 'Pending', value: String(stats.pendingCount) },
        ].map((item) => (
          <article key={item.label} className="rounded-none border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-white/45">{item.label}</p>
            <p className="mt-2 font-mono text-2xl font-semibold">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="flex flex-wrap gap-2">
        {VENDOR_REQUEST_FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={`min-h-[44px] rounded-none px-4 py-2 text-sm transition ${
              filter === option
                ? 'bg-white text-black font-semibold'
                : 'border border-white/15 text-white/70 hover:bg-white/5'
            }`}
          >
            {option}
          </button>
        ))}
      </section>

      {loading ? (
        <div className="rounded-none border border-white/10 bg-white/[0.03] p-8 text-base text-white/60">
          Loading vendor requests...
        </div>
      ) : null}

      {error ? (
        <div
          data-testid="vendor-requests-error-banner"
          className="rounded-none border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-100"
        >
          {error}
        </div>
      ) : null}

      {!loading ? (
        <section className="space-y-4">
          {filtered.map((request) => (
            <article
              key={request.id}
              data-testid={`vendor-request-card-${request.id}`}
              className="rounded-none border border-white/10 bg-white/[0.02] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.07em] text-white/45">{request.type}</p>
                  <h3 className="mt-1 text-lg font-semibold">{request.dealName}</h3>
                  <p className="mt-1 text-sm text-white/60">{request.location}</p>
                  <p className="mt-2 text-base text-white/70">{request.message}</p>
                </div>
                <span className="rounded-none border border-white/15 px-3 py-1 font-mono text-xs">
                  {request.status}
                </span>
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
                    className="min-h-[44px] rounded-none border border-white/15 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
                  >
                    Submit quote
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => declineRequest(request)}
                    className="min-h-[44px] rounded-none border border-white/15 px-4 py-2 text-sm text-white/75 hover:bg-white/5 disabled:opacity-50"
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
        <div className="rounded-none border border-white/10 bg-white/[0.02] p-8 text-base text-white/60">
          No requests in this filter.
        </div>
      ) : null}

      {isRfpModalOpen ? (
        <div
          data-testid="submit-rfp-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
        >
          <form
            onSubmit={handleCreateRfpRequest}
            className="w-full max-w-lg space-y-4 rounded-none border border-white/15 bg-[#12151a] p-6"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">Submit RFP / Quote Request</h3>
              <button
                type="button"
                onClick={() => setIsRfpModalOpen(false)}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-white/60 hover:text-white"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="block text-sm">
              <span className="text-white/70">Project / Property</span>
              <select
                data-testid="rfp-project-select"
                value={rfpProjectId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  setRfpProjectId(nextId);
                  const found = SEED_PROJECTS.find((p) => p.id === nextId);
                  if (found?.address) {
                    setRfpLocation(found.address);
                  }
                }}
                className="mt-2 min-h-[44px] w-full rounded-none border border-white/15 bg-black/40 px-3 py-2 text-base md:text-sm text-white"
              >
                {SEED_PROJECTS.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.propertyName} ({project.address})
                  </option>
                ))}
                <option value="general-rfp">General Portfolio RFP</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-white/70">Vendor Trade / Profession</span>
              <select
                data-testid="rfp-trade-select"
                value={rfpTradeType}
                onChange={(event) => setRfpTradeType(event.target.value)}
                className="mt-2 min-h-[44px] w-full rounded-none border border-white/15 bg-black/40 px-3 py-2 text-base md:text-sm text-white"
              >
                {CANONICAL_VENDOR_PROFESSIONS.map((prof) => (
                  <option key={prof} value={prof}>
                    {prof}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-white/70">Property Location</span>
              <input
                data-testid="rfp-location-input"
                value={rfpLocation}
                onChange={(event) => setRfpLocation(event.target.value)}
                placeholder="e.g. 1247 Elm Street, Austin, TX 78702"
                className="mt-2 min-h-[44px] w-full rounded-none border border-white/15 bg-black/40 px-3 py-2 text-base md:text-sm text-white"
                required
              />
            </label>

            <label className="block text-sm">
              <span className="text-white/70">Scope of Work / RFP Details</span>
              <textarea
                data-testid="rfp-message-textarea"
                value={rfpMessage}
                onChange={(event) => setRfpMessage(event.target.value)}
                placeholder="Describe the scope of work, timeline, and deliverables required..."
                className="mt-2 min-h-28 w-full rounded-none border border-white/15 bg-black/40 px-3 py-2 text-base md:text-sm text-white"
                required
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRfpModalOpen(false)}
                className="min-h-[44px] rounded-none border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="submit-rfp-confirm-btn"
                disabled={rfpSubmitting}
                className="min-h-[44px] rounded-none bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                {rfpSubmitting ? 'Submitting...' : 'Send RFP / Quote Request'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {quoteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={submitQuote}
            className="w-full max-w-md space-y-4 rounded-none border border-white/15 bg-[#12151a] p-6"
          >
            <h3 className="text-lg font-semibold">Submit quote: {quoteTarget.dealName}</h3>
            <label className="block text-sm">
              <span className="text-white/65">Quoted fee (USD)</span>
              <input
                value={quotedFee}
                onChange={(event) => setQuotedFee(event.target.value)}
                className="mt-2 min-h-[44px] w-full rounded-none border border-white/15 bg-black/30 px-3 py-2 text-base md:text-sm"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-white/65">Message</span>
              <textarea
                value={quoteMessage}
                onChange={(event) => setQuoteMessage(event.target.value)}
                className="mt-2 min-h-24 w-full rounded-none border border-white/15 bg-black/30 px-3 py-2 text-base md:text-sm"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setQuoteTarget(null)}
                className="min-h-[44px] rounded-none border border-white/15 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="min-h-[44px] rounded-none bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Submit quote'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

