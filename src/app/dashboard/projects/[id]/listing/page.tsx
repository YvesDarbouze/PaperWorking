'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useWorkspaceProject } from '@/app/dashboard/projects/[id]/layout';
import {
  createDraftListing,
  publishListing,
  pauseListing,
  resumeListing,
  closeListing,
  refreshListingSnapshot,
  getListingByProject,
} from '@/actions/listings';
import type { DealListing } from '@/types/listing';
import ListingStatusBadge from '@/components/listings/ListingStatusBadge';
import PublishPreview from '@/components/listings/PublishPreview';
import toast from 'react-hot-toast';
import posthog from 'posthog-js';

/* ═══════════════════════════════════════════════════════
   /dashboard/projects/[id]/listing — Listing Management

   "Post this Deal" flow + lifecycle controls.
   - Draft: assembles snapshot from project, preview + publish
   - Published: pause, refresh, close controls
   - Paused: resume or close
   - Closed: read-only summary
   ═══════════════════════════════════════════════════════ */

export default function ListingManagementPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { project, refresh } = useWorkspaceProject();
  const projectId = params.id as string;

  const [listing, setListing] = useState<DealListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Load existing listing ──
  useEffect(() => {
    async function load() {
      try {
        const existing = await getListingByProject(projectId);
        setListing(existing as DealListing | null);
      } catch (err) {
        console.error('[Listing] Load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  // ── Action helpers ──
  const withAction = async (action: string, fn: () => Promise<void>) => {
    if (!user) return;
    setActionLoading(action);
    try {
      await fn();
      const updated = await getListingByProject(projectId);
      setListing(updated as DealListing | null);
      refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateDraft = () =>
    withAction('create', async () => {
      const idToken = await user!.getIdToken();
      const result = await createDraftListing(idToken, projectId);
      toast.success('Draft listing created!');
      try { posthog.capture('listing_draft_created', { projectId, listingId: result.listingId }); } catch {}
    });

  const handlePublish = () =>
    withAction('publish', async () => {
      if (!listing) return;
      const idToken = await user!.getIdToken();
      await publishListing(idToken, listing.id);
      toast.success('Deal listing is now live!');
      try { posthog.capture('listing_published', { listingId: listing.id }); } catch {}
    });

  const handlePause = () =>
    withAction('pause', async () => {
      if (!listing) return;
      const idToken = await user!.getIdToken();
      await pauseListing(idToken, listing.id);
      toast.success('Listing paused.');
    });

  const handleResume = () =>
    withAction('resume', async () => {
      if (!listing) return;
      const idToken = await user!.getIdToken();
      await resumeListing(idToken, listing.id);
      toast.success('Listing resumed!');
    });

  const handleClose = () =>
    withAction('close', async () => {
      if (!listing) return;
      const idToken = await user!.getIdToken();
      await closeListing(idToken, listing.id, 'manual');
      toast.success('Listing closed.');
      try { posthog.capture('listing_closed', { listingId: listing.id, reason: 'manual' }); } catch {}
    });

  const handleRefresh = () =>
    withAction('refresh', async () => {
      if (!listing) return;
      const idToken = await user!.getIdToken();
      await refreshListingSnapshot(idToken, listing.id);
      toast.success('Listing snapshot updated with latest project data.');
    });

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-[var(--color-muted)]/10 rounded-lg w-48 animate-pulse" />
        <div className="h-64 bg-[var(--color-muted)]/10 rounded-2xl animate-pulse" />
      </div>
    );
  }

  // ── No listing yet → Create Draft ──
  if (!listing) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-on-surface)]">
            Post this Deal
          </h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Assemble a marketplace listing from your project registry and equity terms.
          </p>
        </div>

        {/* Pre-flight checklist */}
        <div className="glass-card rounded-2xl border border-pw-border p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] flex items-center gap-2">
            <span className="material-symbols-outlined text-base">checklist</span>
            Pre-Flight Check
          </h2>

          {[
            {
              label: 'Property address',
              ok: !!project?.address,
              detail: project?.address || 'Missing — add address in project settings',
            },
            {
              label: 'Capital plan: "Raise Interest"',
              ok: project?.financials?.capitalPlan === 'raise interest',
              detail: project?.financials?.capitalPlan || 'Not set',
            },
            {
              label: 'Equity terms configured',
              ok: !!project?.financials?.equityTerms,
              detail: project?.financials?.equityTerms
                ? `Target: $${((project.financials.equityTerms.funding_target || 0) / 100).toLocaleString()}`
                : 'Missing — configure equity terms first',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-3 p-3 rounded-xl border border-pw-border"
            >
              <span
                className={`material-symbols-outlined text-lg mt-0.5 ${
                  item.ok ? 'text-[var(--color-positive)]' : 'text-[var(--color-error)]'
                }`}
              >
                {item.ok ? 'check_circle' : 'cancel'}
              </span>
              <div>
                <p className="text-sm font-medium text-[var(--color-on-surface)]">
                  {item.label}
                </p>
                <p className="text-xs text-[var(--color-muted)]">{item.detail}</p>
              </div>
            </div>
          ))}

          <button
            onClick={handleCreateDraft}
            disabled={
              actionLoading === 'create' ||
              !project?.address ||
              project?.financials?.capitalPlan !== 'raise interest' ||
              !project?.financials?.equityTerms
            }
            className="luminous-button w-full px-6 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {actionLoading === 'create' ? (
              <>
                <span className="animate-spin material-symbols-outlined text-lg">progress_activity</span>
                Assembling Listing...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">add_circle</span>
                Create Draft Listing
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── Listing exists → Management view ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-[var(--color-on-surface)]">
              Marketplace Listing
            </h1>
            <ListingStatusBadge status={listing.status} />
          </div>
          <p className="text-sm text-[var(--color-muted)]">
            {listing.propertyName} · {listing.neighborhood}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {listing.status === 'draft' && (
            <button
              onClick={handlePublish}
              disabled={actionLoading === 'publish'}
              className="luminous-button px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">publish</span>
              {actionLoading === 'publish' ? 'Publishing...' : 'Publish'}
            </button>
          )}
          {listing.status === 'published' && (
            <>
              <button
                onClick={handlePause}
                disabled={!!actionLoading}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-pw-border text-[var(--color-muted)] hover:text-[var(--color-on-surface)] flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">pause_circle</span>
                Pause
              </button>
              <button
                onClick={handleRefresh}
                disabled={!!actionLoading}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-pw-border text-[var(--color-muted)] hover:text-[var(--color-on-surface)] flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                Refresh
              </button>
            </>
          )}
          {listing.status === 'paused' && (
            <button
              onClick={handleResume}
              disabled={actionLoading === 'resume'}
              className="luminous-button px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">play_circle</span>
              {actionLoading === 'resume' ? 'Resuming...' : 'Resume'}
            </button>
          )}
          {listing.status !== 'closed' && (
            <button
              onClick={handleClose}
              disabled={!!actionLoading}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-[var(--color-error)]/30 text-[var(--color-error)] hover:bg-[var(--color-error)]/10 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">cancel</span>
              Close Listing
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card rounded-xl border border-pw-border p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-1">
            Status
          </p>
          <ListingStatusBadge status={listing.status} />
        </div>
        <div className="glass-card rounded-xl border border-pw-border p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-1">
            Followers
          </p>
          <p className="text-xl font-bold font-mono tabular-nums text-[var(--color-on-surface)]">
            {listing.followCount}
          </p>
        </div>
        <div className="glass-card rounded-xl border border-pw-border p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-1">
            Views
          </p>
          <p className="text-xl font-bold font-mono tabular-nums text-[var(--color-on-surface)]">
            {listing.viewCount}
          </p>
        </div>
      </div>

      {/* Closed notice */}
      {listing.status === 'closed' && (
        <div className="glass-card rounded-2xl border border-[var(--color-error)]/20 p-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-[var(--color-error)]">
              block
            </span>
            <div>
              <p className="text-base font-bold text-[var(--color-on-surface)]">
                Listing Closed
              </p>
              <p className="text-sm text-[var(--color-muted)]">
                {listing.closedReason === 'auto_phase_advance'
                  ? 'Automatically closed when the project advanced to the next phase.'
                  : listing.closedReason === 'project_archived'
                  ? 'Closed because the project was archived.'
                  : 'Manually closed by the listing owner.'}
                {listing.closedAt && ` · ${new Date(listing.closedAt).toLocaleDateString()}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Preview — visible for draft and published states */}
      {(listing.status === 'draft' || listing.status === 'published' || listing.status === 'paused') && (
        <PublishPreview listing={listing} />
      )}

      {/* Public link */}
      {listing.status === 'published' && (
        <div className="glass-card rounded-xl border border-pw-border p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-lg text-[var(--color-primary)]">
            link
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-0.5">
              Public Listing URL
            </p>
            <p className="text-sm font-mono text-[var(--color-on-surface)] truncate">
              {typeof window !== 'undefined' ? `${window.location.origin}/deals/${listing.id}` : `/deals/${listing.id}`}
            </p>
          </div>
          <button
            onClick={() => {
              const url = `${window.location.origin}/deals/${listing.id}`;
              navigator.clipboard.writeText(url);
              toast.success('Link copied!');
            }}
            className="px-3 py-2 rounded-lg border border-pw-border text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-on-surface)] transition-all"
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}
