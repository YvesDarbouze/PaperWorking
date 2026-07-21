'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { followInvestor, unfollowInvestor, updateFollowConsent } from '@/actions/follows';
import ConsentModal from './ConsentModal';
import posthog from 'posthog-js';

/* ═══════════════════════════════════════════════════════
   FollowInvestorButton (AQ-27)
   
   "Follow Investor" CTA for subscriber view.
   Creates a user-to-user edge in investorFollowers
   collection, then asks for notification consent.
   ═══════════════════════════════════════════════════════ */

interface FollowInvestorButtonProps {
  investorUid: string;
  investorName: string;
  isFollowing: boolean;
  onFollowChange?: (following: boolean) => void;
  className?: string;
}

export default function FollowInvestorButton({
  investorUid,
  investorName,
  isFollowing: initialFollowing,
  onFollowChange,
  className = '',
}: FollowInvestorButtonProps) {
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
        await unfollowInvestor(idToken, investorUid);
        setFollowing(false);
        onFollowChange?.(false);
      } else {
        await followInvestor(idToken, investorUid);
        setFollowing(true);
        onFollowChange?.(true);
        setShowConsent(true);

        try {
          posthog.capture('investor_followed', { investorUid });
        } catch { /* telemetry non-fatal */ }
      }
    } catch (err) {
      console.error('Follow investor failed:', err);
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
        'investorFollowers',
        `${investorUid}_${user.uid}`,
        consent,
      );
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
          {following ? 'person_check' : 'person_add'}
        </span>
        {loading ? 'Loading...' : following ? 'Following' : `Follow ${investorName.split(' ')[0]}`}
      </button>

      <ConsentModal
        isOpen={showConsent}
        onClose={() => setShowConsent(false)}
        onSubmit={handleConsentSubmit}
        followTarget={`investor ${investorName}`}
      />
    </>
  );
}
