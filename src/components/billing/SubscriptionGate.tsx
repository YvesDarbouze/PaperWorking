'use client';

import { useAuth } from '@/context/AuthContext';
import { Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { PlanId } from '@/lib/stripe/plans';

/* ═══════════════════════════════════════════════════════
   SubscriptionGate

   Wraps premium features and renders a paywall prompt
   if the user's current plan doesn't meet the required tier.

   Usage:
     <SubscriptionGate requiredPlan="team" feature="Team Analytics">
       <TeamAnalyticsDashboard />
     </SubscriptionGate>

   Plan hierarchy: vendor < individual < team
   ═══════════════════════════════════════════════════════ */

const PLAN_HIERARCHY: Record<string, number> = {
  'None':           0,
  'Vendor Network': 1,
  'Individual':     2,
  'Team':           3,
};

const PLAN_ID_TO_CANONICAL: Record<PlanId, string> = {
  vendor:     'Vendor Network',
  individual: 'Individual',
  team:       'Team',
};

interface SubscriptionGateProps {
  /** Minimum plan required to access the gated content */
  requiredPlan: PlanId;
  /** Human-readable feature name shown in the paywall */
  feature: string;
  /** Content rendered when the user meets the plan requirement */
  children: React.ReactNode;
  /** Optional custom fallback component */
  fallback?: React.ReactNode;
}

export default function SubscriptionGate({
  requiredPlan,
  feature,
  children,
  fallback,
}: SubscriptionGateProps) {
  const { profile, loading } = useAuth();

  // While auth state is loading, show nothing to prevent flash
  if (loading) return null;

  const currentPlan = profile?.subscriptionPlan ?? 'None';
  const currentLevel = PLAN_HIERARCHY[currentPlan] ?? 0;
  const requiredLevel = PLAN_HIERARCHY[PLAN_ID_TO_CANONICAL[requiredPlan]] ?? 0;

  // User has sufficient access
  if (currentLevel >= requiredLevel) {
    return <>{children}</>;
  }

  // Custom fallback
  if (fallback) return <>{fallback}</>;

  // Default paywall prompt
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
        style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-ui)' }}
      >
        <Lock className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} />
      </div>

      <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        Upgrade to Access {feature}
      </h3>

      <p className="text-sm mb-6 max-w-md leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {feature} requires the{' '}
        <strong>{PLAN_ID_TO_CANONICAL[requiredPlan]}</strong> plan or higher.
        Upgrade now to unlock this feature and more.
      </p>

      <Link
        href="/pricing"
        className="ag-button inline-flex items-center gap-2 !py-2.5 !px-6"
      >
        View Plans
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
