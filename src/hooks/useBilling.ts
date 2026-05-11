'use client';

import { useAuth } from '@/context/AuthContext';
import { useCallback, useState } from 'react';
import type { PlanId } from '@/lib/stripe/plans';

/* ═══════════════════════════════════════════════════════
   useBilling Hook

   Centralizes all billing state and actions in one place.
   Prevents billing logic from leaking across components.

   Usage:
     const { plan, isActive, isPastDue, openPortal, startCheckout } = useBilling();
   ═══════════════════════════════════════════════════════ */

const PLAN_HIERARCHY: Record<string, number> = {
  'None': 0,
  'Vendor Network': 1,
  'Individual': 2,
  'Team': 3,
};

export function useBilling() {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const plan = profile?.subscriptionPlan ?? 'None';
  const status = profile?.subscriptionStatus ?? 'inactive';
  const cancelAtPeriodEnd = profile?.cancelAtPeriodEnd ?? false;
  const currentPeriodEnd = profile?.currentPeriodEnd ?? null;

  // Derived state
  const isActive = status === 'active' || status === 'trialing';
  const isTrialing = status === 'trialing';
  const isPastDue = status === 'past_due';
  const isCanceled = status === 'canceled';
  const isSubscribed = plan !== 'None' && isActive;

  /**
   * Check if user's plan meets or exceeds a required tier.
   */
  const hasPlan = useCallback((requiredPlan: PlanId): boolean => {
    const PLAN_ID_TO_CANONICAL: Record<PlanId, string> = {
      vendor: 'Vendor Network',
      individual: 'Individual',
      team: 'Team',
    };

    const currentLevel = PLAN_HIERARCHY[plan] ?? 0;
    const requiredLevel = PLAN_HIERARCHY[PLAN_ID_TO_CANONICAL[requiredPlan]] ?? 0;
    return currentLevel >= requiredLevel;
  }, [plan]);

  /**
   * Opens the Stripe Customer Portal for self-service billing management.
   */
  const openPortal = useCallback(async () => {
    if (!user) return;

    if (!isSubscribed) {
      window.location.href = '/pricing';
      return;
    }

    setIsLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      console.error('[useBilling] Portal error:', err);
      setIsLoading(false);
      throw err;
    }
  }, [user, isSubscribed]);

  /**
   * Initiates a checkout session for a given plan.
   * Accepts either:
   *   - "Vendor Marketplace Monthly" (auto-parses interval)
   *   - ("Vendor Marketplace", "monthly") (explicit interval)
   */
  const startCheckout = useCallback(async (
    planName: string,
    explicitInterval?: 'monthly' | 'annual'
  ) => {
    setIsLoading(true);
    try {
      // Parse interval from plan name suffix if not explicitly provided
      let plan = planName;
      let interval: 'monthly' | 'annual' = explicitInterval ?? 'monthly';

      if (!explicitInterval) {
        const lower = planName.toLowerCase();
        if (lower.endsWith(' annual')) {
          plan = planName.slice(0, -' Annual'.length);
          interval = 'annual';
        } else if (lower.endsWith(' monthly')) {
          plan = planName.slice(0, -' Monthly'.length);
          interval = 'monthly';
        }
      }

      const idToken = user ? await user.getIdToken() : undefined;
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          billingInterval: interval,
          userId: user?.uid,
          userEmail: user?.email,
          idToken,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout failed');
      window.location.href = data.url;
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  }, [user]);

  return {
    // State
    plan,
    status,
    isActive,
    isTrialing,
    isPastDue,
    isCanceled,
    isSubscribed,
    cancelAtPeriodEnd,
    currentPeriodEnd,
    isLoading,

    // Actions
    hasPlan,
    openPortal,
    startCheckout,
  };
}
