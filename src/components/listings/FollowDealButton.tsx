'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { followDeal, unfollowDeal } from '@/actions/follows';
import { updateFollowConsent } from '@/actions/follows';
import ConsentModal from './ConsentModal';
import posthog from 'posthog-js';

/* ═══════════════════════════════════════════════════════
   FollowDealButton (AQ-27)
   
   "Follow Deal" CTA for subscriber view.
   On click → creates the follow edge → opens ConsentModal
   for separate email/in-app consent.
   ═══════════════════════════════════════════════════════ */

interface FollowDealButtonProps {
  listingId: string;
  projectId: string;
  isFollowing: boolean;
  onFollowChange?: (following: boolean) => void;
  className?: string;
}

export default function FollowDealButton({
  listingId,
  projectId,
  isFollowing: initialFollowing,
  onFollowChange,
  className = '',
}: FollowDealButtonProps) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const [showConsent, setShowConsent] = useState(false);

  const handleToggle = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const idToken = await user.getIdToken();

      if (following) {
        await unfollowDeal(idToken, listingId);
        setFollowing(false);
        onFollowChange?.(false);
      } else {
        await followDeal(idToken, listingId);
        setFollowing(true);
        onFollowChange?.(true);
        // Open consent modal AFTER successful follow
        setShowConsent(true);

        try {
          posthog.capture('deal_followed', { listingId, projectId });
        } catch { /* telemetry non-fatal */ }
      }
    } catch (err) {
      console.error('Follow action failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConsentSubmit = async (consent: { emailConsent: boolean; inAppConsent: boolean }) => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      await updateFollowConsent(
        idToken,
        `projects/${projectId}/followers`,
        user.uid,
        consent,
      );
      try {
        posthog.capture('follow_consent_updated', {
          followId: user.uid,
          emailConsent: consent.emailConsent,
          inAppConsent: consent.inAppConsent,
        });
      } catch { /* telemetry non-fatal */ }
    } catch (err) {
      console.error('Consent update failed:', err);
    }
  };

  return (
    <>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`
          inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
          transition-all duration-200 disabled:opacity-50
          ${following
            ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/25 hover:bg-[var(--color-primary)]/20'
            : 'border border-pw-border text-[var(--color-on-surface)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]'
          }
          ${className}
        `}
      >
        <span className="material-symbols-outlined text-lg">
          {following ? 'bookmark_added' : 'bookmark_add'}
        </span>
        {loading ? 'Loading...' : following ? 'Following' : 'Follow Deal'}
      </button>

      <ConsentModal
        isOpen={showConsent}
        onClose={() => setShowConsent(false)}
        onSubmit={handleConsentSubmit}
        followTarget="this deal"
      />
    </>
  );
}
