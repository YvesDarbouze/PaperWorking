'use client';

import React from 'react';
import { Lock, ArrowRight, Sparkles, X } from 'lucide-react';
import { useBilling } from '@/hooks/useBilling';
import type { EntitlementPlanId } from '@/lib/entitlements';
import { PLAN_LEVEL } from '@/lib/entitlements';
import { PLAN_CATALOG } from '@/lib/stripe/plans';
import type { PlanId } from '@/lib/stripe/plans';

/* ═══════════════════════════════════════════════════════
   UpgradePromptModal — Glass-Card Upgrade CTA

   Shown when a gated feature is denied. Displays:
   - The exact feature denied
   - Current plan → required plan delta
   - Price difference
   - "Upgrade Now" CTA linking to Stripe Checkout
   ═══════════════════════════════════════════════════════ */

interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureLabel: string;
  currentPlan: EntitlementPlanId;
  requiredPlan: EntitlementPlanId;
}

// Map EntitlementPlanId → Stripe PlanId for catalog lookup
const ENTITLEMENT_TO_STRIPE: Partial<Record<EntitlementPlanId, PlanId>> = {
  vendor: 'vendor',
  individual: 'individual',
  team: 'team',
};

// Human-readable plan names
const PLAN_DISPLAY_NAMES: Record<EntitlementPlanId, string> = {
  none: 'Free',
  vendor: 'Solo',
  individual: 'Investor',
  team: 'Team',
};

export default function UpgradePromptModal({
  isOpen,
  onClose,
  featureLabel,
  currentPlan,
  requiredPlan,
}: UpgradePromptModalProps) {
  const { startCheckout, isLoading } = useBilling();

  if (!isOpen) return null;

  const currentDisplayName = PLAN_DISPLAY_NAMES[currentPlan];
  const requiredDisplayName = PLAN_DISPLAY_NAMES[requiredPlan];

  // Look up pricing from the canonical plan catalog
  const requiredStripePlanId = ENTITLEMENT_TO_STRIPE[requiredPlan];
  const currentStripePlanId = ENTITLEMENT_TO_STRIPE[currentPlan];

  const requiredPlanConfig = requiredStripePlanId ? PLAN_CATALOG[requiredStripePlanId] : null;
  const currentPlanConfig = currentStripePlanId ? PLAN_CATALOG[currentStripePlanId] : null;

  const requiredMonthly = requiredPlanConfig?.monthlyPrice ?? 0;
  const currentMonthly = currentPlanConfig?.monthlyPrice ?? 0;
  const priceDiff = requiredMonthly - currentMonthly;

  const handleUpgrade = async () => {
    if (!requiredStripePlanId) return;
    const canonicalName = PLAN_CATALOG[requiredStripePlanId].canonicalName;
    try {
      await startCheckout(canonicalName, 'monthly');
    } catch (err) {
      console.error('[UpgradePromptModal] Checkout error:', err);
    }
  };

  // Features included in the upgrade (simplified comparison)
  const upgradeFeatures = getUpgradeFeatures(currentPlan, requiredPlan);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Glass Card */}
      <div className="relative w-full max-w-md bg-bg-surface/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border-ui overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-bg-primary/50 transition"
        >
          <X className="w-5 h-5 text-text-secondary" />
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/20">
            <Lock className="w-7 h-7 text-white" />
          </div>

          <h2 className="text-xl font-bold text-text-primary mb-2">
            Unlock {featureLabel}
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            <strong>{featureLabel}</strong> requires the{' '}
            <span className="font-semibold text-text-primary">{requiredDisplayName}</span>{' '}
            plan.
          </p>
        </div>

        {/* Plan comparison */}
        <div className="px-8 py-4">
          <div className="flex items-center gap-3 text-sm">
            <div className="flex-1 rounded-xl bg-bg-primary/50 border border-border-ui px-4 py-3 text-center">
              <div className="text-xs text-text-secondary mb-1">Current</div>
              <div className="font-semibold text-text-primary">{currentDisplayName}</div>
              {currentMonthly > 0 && (
                <div className="text-xs text-text-secondary mt-0.5">${currentMonthly}/mo</div>
              )}
            </div>

            <ArrowRight className="w-5 h-5 text-text-secondary shrink-0" />

            <div className="flex-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 px-4 py-3 text-center">
              <div className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">Upgrade to</div>
              <div className="font-semibold text-indigo-700 dark:text-indigo-300">{requiredDisplayName}</div>
              {requiredMonthly > 0 && (
                <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">${requiredMonthly}/mo</div>
              )}
            </div>
          </div>

          {priceDiff > 0 && (
            <div className="text-center mt-3 text-xs text-text-secondary">
              +${priceDiff}/mo additional
            </div>
          )}
        </div>

        {/* Upgrade features list */}
        {upgradeFeatures.length > 0 && (
          <div className="px-8 py-3">
            <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              What you&apos;ll unlock
            </div>
            <ul className="space-y-1.5">
              {upgradeFeatures.map((feat) => (
                <li key={feat} className="flex items-center gap-2 text-sm text-text-primary">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  {feat}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <div className="px-8 pt-4 pb-8">
          <button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full py-3 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Upgrade Now
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="w-full mt-2 py-2 text-sm text-text-secondary hover:text-text-primary transition"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helper: derive features gained from upgrade ──

function getUpgradeFeatures(
  currentPlan: EntitlementPlanId,
  requiredPlan: EntitlementPlanId
): string[] {
  const features: string[] = [];
  const currentLevel = PLAN_LEVEL[currentPlan];
  const requiredLevel = PLAN_LEVEL[requiredPlan];

  if (requiredLevel <= currentLevel) return features;

  // Individual features
  if (currentLevel < 2 && requiredLevel >= 2) {
    features.push('Unlimited Projects');
    features.push('Compare Board');
    features.push('Portfolio Roll-ups');
  }

  // Team features
  if (currentLevel < 3 && requiredLevel >= 3) {
    features.push('Vendor Seats');
    features.push('Priority Support');
    features.push('API Access');
    features.push('White-Label Export');
  }

  return features;
}
