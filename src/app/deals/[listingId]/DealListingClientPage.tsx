'use client';

/* ═══════════════════════════════════════════════════════
   PaperWorking — Public Deal Listing Page (AQ-27)

   /deals/[listingId]

   PUBLIC route (no auth required). Auth-aware rendering:
     • Subscribers → full DealFullView
     • Everyone else → obfuscated DealTeaserView
   ═══════════════════════════════════════════════════════ */

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';
import DealFullView from '@/components/listings/DealFullView';
import DealTeaserView from '@/components/listings/DealTeaserView';
import { getPublicListing, getSubscriberListing } from '@/actions/listings';
import { checkFollowStatus } from '@/actions/follows';
import type { DealListing, DealListingTeaser } from '@/types/listing';
import type { Project } from '@/types/schema';
import posthog from 'posthog-js';

// ── View state discriminated union ───────────────────────
type ViewState =
  | { mode: 'loading' }
  | { mode: 'not-found' }
  | {
      mode: 'subscriber';
      listing: DealListing;
      project: Project;
      followStatus: { followingDeal: boolean; followingInvestor: boolean };
    }
  | { mode: 'teaser'; teaser: DealListingTeaser };

interface Props {
  listingId: string;
  initialTeaser: DealListingTeaser | null;
}

export default function DealListingClientPage({ listingId, initialTeaser }: Props) {
  const { user, profile, loading: authLoading } = useAuth();

  const [viewState, setViewState] = useState<ViewState>(
    initialTeaser ? { mode: 'teaser', teaser: initialTeaser } : { mode: 'loading' }
  );

  // ── Fetch logic ──────────────────────────────────────────
  const fetchListing = useCallback(async () => {
    if (!listingId) {
      setViewState({ mode: 'not-found' });
      return;
    }

    // ── Mode B: Authenticated subscriber (non-vendor) ────
    if (user && profile && profile.accountType !== 'vendor') {
      try {
        const idToken = await user.getIdToken();
        const [match, followStatus] = await Promise.all([
          getSubscriberListing(idToken, listingId),
          checkFollowStatus(idToken, listingId),
        ]);

        setViewState({
          mode: 'subscriber',
          listing: match.listing,
          project: match.project,
          followStatus,
        });
        posthog.capture('listing_viewed', { listingId, mode: 'subscriber' });
        return;
      } catch (err) {
        console.error('Subscriber view fetch error:', err);
        // Subscriber fetch failed (no subscription, expired token, etc.)
        // Fall through to public teaser
      }
    }

    // ── Mode A: Public teaser (logged-out or fallback) ───
    try {
      const teaser = await getPublicListing(listingId);
      if (!teaser) {
        setViewState({ mode: 'not-found' });
        return;
      }

      setViewState({ mode: 'teaser', teaser });
      posthog.capture('listing_viewed', { listingId, mode: 'teaser' });
    } catch {
      setViewState({ mode: 'not-found' });
    }
  }, [listingId, user, profile]);

  useEffect(() => {
    // Wait for auth to settle before deciding which view to render
    if (authLoading) return;
    fetchListing();
  }, [authLoading, fetchListing]);

  // ── Follow change handler (refetch after toggle) ───────
  const handleFollowChange = useCallback(() => {
    fetchListing();
  }, [fetchListing]);

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <LandingHeader />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {viewState.mode === 'loading' && <LoadingSkeleton />}

        {viewState.mode === 'not-found' && <NotFoundCard />}

        {viewState.mode === 'subscriber' && (
          <DealFullView
            listing={viewState.listing}
            project={viewState.project}
            followStatus={viewState.followStatus}
            onFollowChange={handleFollowChange}
          />
        )}

        {viewState.mode === 'teaser' && (
          <DealTeaserView teaser={viewState.teaser} />
        )}
      </main>
      <LandingFooter />
    </div>
  );
}

// ── Loading Skeleton ─────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading deal listing">
      {/* Hero card */}
      <div className="h-32 rounded-2xl bg-[var(--color-muted)]/10" />

      {/* Metric cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="h-20 rounded-2xl bg-[var(--color-muted)]/10" />
        <div className="h-20 rounded-2xl bg-[var(--color-muted)]/10" />
        <div className="h-20 rounded-2xl bg-[var(--color-muted)]/10" />
        <div className="h-20 rounded-2xl bg-[var(--color-muted)]/10" />
      </div>

      {/* Details card */}
      <div className="h-24 rounded-2xl bg-[var(--color-muted)]/10" />
    </div>
  );
}

// ── Not Found Card ───────────────────────────────────────
function NotFoundCard() {
  return (
    <div className="glass-card rounded-2xl border border-pw-border p-12 text-center">
      <span className="material-symbols-outlined text-4xl text-[var(--color-muted)] mb-4 block">
        search_off
      </span>
      <h2 className="text-xl font-bold text-[var(--color-on-surface)] mb-2">
        Deal Not Found
      </h2>
      <p className="text-sm text-[var(--color-muted)]">
        This listing may have been closed or removed.
      </p>
    </div>
  );
}
