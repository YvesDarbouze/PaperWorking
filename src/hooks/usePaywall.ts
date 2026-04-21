'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export type SubscriptionTier = 'free' | 'paid' | 'guest';

/**
 * Derives the user's access tier from their Firestore profile.
 *
 * - guest: arrived via a crowdfund/collaborator invite link (has inviteToken + invitedToProjectId)
 * - paid:  active or past_due subscription (not a guest)
 * - free:  no active subscription (new signups, canceled accounts)
 */
function deriveTier(profile: any): SubscriptionTier {
  if (!profile) return 'free';
  if (profile.inviteToken && profile.invitedToProjectId) return 'guest';
  const status: string = profile.subscriptionStatus ?? '';
  if (status === 'active' || status === 'past_due') return 'paid';
  return 'free';
}

/**
 * usePaywall
 *
 * Single source of truth for subscription-gated actions.
 *
 * Usage:
 *   const { isPaid, isGuest, requireSubscription } = usePaywall();
 *   <button onClick={() => requireSubscription(() => openWizard())}>New Project</button>
 *
 * requireSubscription runs the action if the user is paid, otherwise
 * performs a hard router.push('/pricing').
 */
export function usePaywall() {
  const { profile } = useAuth();
  const router = useRouter();

  const tier = deriveTier(profile);

  const requireSubscription = useCallback(
    (action: () => void) => {
      if (tier === 'paid') {
        action();
      } else {
        router.push('/pricing');
      }
    },
    [tier, router],
  );

  return {
    tier,
    isPaid: tier === 'paid',
    isGuest: tier === 'guest',
    isFree: tier === 'free',
    requireSubscription,
  };
}
