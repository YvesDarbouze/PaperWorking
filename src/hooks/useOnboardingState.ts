'use client';

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';

/* ═══════════════════════════════════════════════════════
   useOnboardingState — Central Onboarding Progress Hook
   
   Derives onboarding phase from user profile fields:
   - showIntent:      user has no onboardingIntent set
   - showOverlay:     user has intent but hasn't lit first metric
   - showCelebration: first metric just lit (within session)
   
   All state is read from Firestore profile — no local
   storage that could get stale or desync between devices.
   ═══════════════════════════════════════════════════════ */

export interface OnboardingState {
  /** Phase A: User needs to pick their intent */
  showIntent: boolean;
  /** Phase B: Show the guided overlay on workspace */
  showOverlay: boolean;
  /** Phase B: Show the first-metric celebration modal */
  showCelebration: boolean;
  /** Whether onboarding is fully complete */
  isComplete: boolean;
  /** The user's selected intent, if any */
  intent: string | null;
  /** Whether the profile is still loading */
  loading: boolean;
}

export function useOnboardingState(): OnboardingState {
  const { profile, loading, user } = useAuth();

  return useMemo(() => {
    // Not authenticated or still loading — return safe defaults
    if (!user || loading || !profile) {
      return {
        showIntent: false,
        showOverlay: false,
        showCelebration: false,
        isComplete: false,
        intent: null,
        loading: loading,
      };
    }

    const hasIntent = !!profile.onboardingIntent;
    const hasFirstMetric = !!profile.firstMetricLit;
    const overlayDismissed = !!profile.onboardingOverlayDismissed;
    const onboardingDone = !!profile.onboardingCompleted;

    // Phase A — Orient: needs intent selection
    const showIntent = !hasIntent;

    // Phase B — Activate: has intent, hasn't lit a metric yet
    // Overlay shows until either metric is lit OR user explicitly dismissed
    const showOverlay = hasIntent && !hasFirstMetric && !overlayDismissed && !onboardingDone;

    // Celebration: metric just lit and onboarding not yet marked complete
    // This is a one-time modal — once they interact with it, onboardingCompleted is set
    const showCelebration = hasIntent && hasFirstMetric && !onboardingDone;

    return {
      showIntent,
      showOverlay,
      showCelebration,
      isComplete: onboardingDone,
      intent: profile.onboardingIntent || null,
      loading: false,
    };
  }, [profile, loading, user]);
}
