'use client';

import { useBilling } from '@/hooks/useBilling';
import { useAuth } from '@/context/AuthContext';
import { useCallback, useEffect, useState } from 'react';
import type {
  FeatureKey,
  EntitlementPlanId,
} from '@/lib/entitlements';
import {
  FEATURE_LABELS,
  FEATURE_MIN_PLAN,
  PLAN_LEVEL,
} from '@/lib/entitlements';

/* ═══════════════════════════════════════════════════════
   useEntitlements — Client-Side Hint (NOT Source of Truth)

   Wraps useBilling() and derives feature access client-side
   for optimistic UI gating. The server-side entitlements
   module is always the authoritative check.

   Usage:
     const { canAccess, requireFeature, projectLimit } = useEntitlements();

     // Passive check
     if (canAccess('compare_board')) { ... }

     // Active gating (shows upgrade modal if denied)
     requireFeature('portfolio_rollups');
   ═══════════════════════════════════════════════════════ */

// Map Firestore canonical plan names to EntitlementPlanId
const CANONICAL_TO_ENTITLEMENT: Record<string, EntitlementPlanId> = {
  'None': 'none',
  'Individual': 'individual',
  'Team': 'team',
  'Vendor Network': 'vendor',
};

// Project limits per plan (mirrored from server-side entitlements)
const MAX_PROJECTS: Record<EntitlementPlanId, number> = {
  none: 1,
  vendor: 5,
  individual: Infinity,
  team: Infinity,
};

export interface UpgradePromptState {
  isOpen: boolean;
  featureKey: FeatureKey | null;
  featureLabel: string;
  currentPlan: EntitlementPlanId;
  requiredPlan: EntitlementPlanId;
}

export function useEntitlements() {
  const { plan: firestorePlan, isActive, isSubscribed } = useBilling();
  const { user } = useAuth();

  // Derive the entitlement plan ID from Firestore plan name
  const planId: EntitlementPlanId =
    CANONICAL_TO_ENTITLEMENT[firestorePlan] ?? 'none';
  const planLevel = PLAN_LEVEL[planId];

  // Upgrade prompt state
  const [upgradePrompt, setUpgradePrompt] = useState<UpgradePromptState>({
    isOpen: false,
    featureKey: null,
    featureLabel: '',
    currentPlan: 'none',
    requiredPlan: 'none',
  });

  // Project count (fetched from the server for accuracy)
  const [projectCount, setProjectCount] = useState<number | null>(null);
  const [projectCountLoading, setProjectCountLoading] = useState(false);

  // Fetch project count on mount / plan change
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    setProjectCountLoading(true);

    (async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch('/api/entitlements/project-count', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
        });
        if (!cancelled && res.ok) {
          const data = await res.json();
          if (data?.count !== undefined) {
            setProjectCount(data.count);
          }
        }
      } catch {
        // Silently fail — project count is a hint, not critical
      } finally {
        if (!cancelled) setProjectCountLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, firestorePlan]);

  /**
   * Passive check: does the current plan include this feature?
   */
  const canAccess = useCallback(
    (featureKey: FeatureKey): boolean => {
      if (!isActive) return false;
      const requiredPlan = FEATURE_MIN_PLAN[featureKey];
      const requiredLevel = PLAN_LEVEL[requiredPlan];
      return planLevel >= requiredLevel;
    },
    [planLevel, isActive]
  );

  /**
   * Active gating: opens upgrade modal if feature is denied.
   * Returns true if access is granted, false if denied (modal shown).
   */
  const requireFeature = useCallback(
    (featureKey: FeatureKey): boolean => {
      if (canAccess(featureKey)) return true;

      const requiredPlan = FEATURE_MIN_PLAN[featureKey];
      setUpgradePrompt({
        isOpen: true,
        featureKey,
        featureLabel: FEATURE_LABELS[featureKey],
        currentPlan: planId,
        requiredPlan,
      });
      return false;
    },
    [canAccess, planId]
  );

  /**
   * Can the user create a new project?
   */
  const canCreateProject = useCallback((): boolean => {
    const limit = MAX_PROJECTS[planId];
    if (limit === Infinity) return true;
    if (projectCount === null) return true; // Optimistic until loaded
    return projectCount < limit;
  }, [planId, projectCount]);

  /**
   * Dismiss the upgrade prompt modal.
   */
  const dismissUpgradePrompt = useCallback(() => {
    setUpgradePrompt((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    // Plan info
    planId,
    planLevel,
    isActive,
    isSubscribed,

    // Feature access
    canAccess,
    requireFeature,

    // Project limits
    projectLimit: MAX_PROJECTS[planId],
    projectCount,
    projectCountLoading,
    canCreateProject,

    // Upgrade prompt state
    upgradePrompt,
    dismissUpgradePrompt,
  };
}
