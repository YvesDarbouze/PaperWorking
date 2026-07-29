'use client';

import React from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useBilling } from '@/hooks/useBilling';
import { useAuth } from '@/context/AuthContext';

/* ═══════════════════════════════════════════════════════
   AccountTierSettings — Individual vs Team Toggle

   Source of truth: Firestore users/{uid}.subscriptionPlan,
   read via useBilling() → useAuth().profile (onSnapshot).
   The Zustand store is a downstream cache — tier gating
   uses useBilling().hasPlan() which reads from profile
   directly, so a direct Zustand mutation gains nothing.

   Tier changes always route through Stripe; the tier field
   in Firestore is only written by the webhook handler
   (checkout.session.completed / customer.subscription.*).
   ═══════════════════════════════════════════════════════ */

export default function AccountTierSettings() {
  const { profile } = useAuth();
  const {
    plan,
    hasPlan,
    isSubscribed,
    openPortal,
    startCheckout,
    isLoading: billingLoading,
  } = useBilling();

  const [pendingTier, setPendingTier] = React.useState<'Individual' | 'Team' | null>(null);

  // Authoritative tier — derived from Firestore profile.subscriptionPlan
  // via useBilling(). A direct Zustand mutation cannot change this value
  // because hasPlan() reads profile?.subscriptionPlan, not the store.
  const isTeamTier = hasPlan('team');
  const accountTier: 'Individual' | 'Team' = isTeamTier ? 'Team' : 'Individual';

  const isTransitioning = billingLoading || pendingTier !== null;
  const profileLoading = profile === null;

  const handleTierChange = async (targetTier: 'Individual' | 'Team') => {
    if (targetTier === accountTier) return;
    if (isTransitioning) return;

    setPendingTier(targetTier);
    const toastId = toast.loading(
      isSubscribed
        ? 'Redirecting to Stripe Billing Portal…'
        : `Opening checkout for ${targetTier === 'Team' ? 'Investment Team' : 'Investor'} plan…`
    );

    try {
      if (isSubscribed) {
        // Existing subscriber — open the Stripe Customer Portal so they can
        // upgrade/downgrade through Stripe's own plan-switching UI.
        await openPortal();
      } else {
        // No active subscription — start a new checkout session for the
        // selected plan. The tier will update in Firestore only after the
        // checkout.session.completed webhook confirms the payment.
        await startCheckout(targetTier === 'Team' ? 'Investment Team' : 'Investor');
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err instanceof Error ? err.message : 'Failed to initiate plan change.');
      setPendingTier(null);
    }
    // Note: no finally { setPendingTier(null) } — both openPortal and
    // startCheckout redirect the current window, so the component unmounts.
    // If the redirect throws (caught above) we clear pendingTier there.
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden relative flex flex-col transition-all duration-200 hover:shadow-md">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-pw-border/50">
        <h3 className="text-base font-semibold text-pw-black flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-pw-primary select-none">shield</span>
          Account Tier
        </h3>
        <p className="text-xs text-pw-muted mt-0.5">Controls team size and collaboration features.</p>
      </div>

      <div className="p-6">
        {/* Loading skeleton — Firestore profile not yet arrived */}
        {profileLoading ? (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-pw-border bg-pw-glass-bg/50 animate-pulse h-28"
              />
            ))}
          </div>
        ) : (
          <>
            {/* Tier picker */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Individual */}
              <button
                onClick={() => handleTierChange('Individual')}
                disabled={isTransitioning}
                className={`relative p-4 rounded-xl border transition-all duration-200 text-left ${
                  isTransitioning ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                } ${
                  accountTier === 'Individual'
                    ? 'border-pw-primary/45 bg-pw-primary/10 shadow-[0_0_15px_rgba(69,73,85,0.15)]'
                    : 'border-pw-border bg-pw-glass-bg/50 text-pw-muted hover:border-pw-muted/40'
                }`}
              >
                {pendingTier === 'Individual' && billingLoading ? (
                  <div className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-sm text-pw-primary animate-spin select-none">
                      progress_activity
                    </span>
                  </div>
                ) : accountTier === 'Individual' ? (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-pw-primary/20 border border-pw-primary/30 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-[12px] text-pw-primary font-bold select-none">
                      check
                    </span>
                  </div>
                ) : null}
                <div className="w-10 h-10 bg-pw-glass-bg border border-pw-border rounded-lg flex items-center justify-center mb-3 text-pw-primary">
                  <span className="material-symbols-outlined text-xl select-none">person</span>
                </div>
                <p className="text-sm font-bold text-pw-black">Individual</p>
                <p className="font-label-sm text-label-sm text-pw-muted mt-1.5 leading-relaxed">
                  Single operator. You manage all projects solo.
                </p>
              </button>

              {/* Team */}
              <button
                onClick={() => handleTierChange('Team')}
                disabled={isTransitioning}
                className={`relative p-4 rounded-xl border transition-all duration-200 text-left ${
                  isTransitioning ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                } ${
                  accountTier === 'Team'
                    ? 'border-pw-primary/45 bg-pw-primary/10 shadow-[0_0_15px_rgba(69,73,85,0.15)]'
                    : 'border-pw-border bg-pw-glass-bg/50 text-pw-muted hover:border-pw-muted/40'
                }`}
              >
                {pendingTier === 'Team' && billingLoading ? (
                  <div className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-sm text-pw-primary animate-spin select-none">
                      progress_activity
                    </span>
                  </div>
                ) : accountTier === 'Team' ? (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-pw-primary/20 border border-pw-primary/30 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-[12px] text-pw-primary font-bold select-none">
                      check
                    </span>
                  </div>
                ) : null}
                <div className="w-10 h-10 bg-pw-glass-bg border border-pw-border rounded-lg flex items-center justify-center mb-3 text-pw-primary">
                  <span className="material-symbols-outlined text-xl select-none">group</span>
                </div>
                <p className="text-sm font-bold text-pw-black">Team</p>
                <p className="font-label-sm text-label-sm text-pw-muted mt-1.5 leading-relaxed">
                  Up to 10 members. Delegate projects and assign roles.
                </p>
              </button>
            </div>

            {/* "Change processing" banner — shown after the Stripe redirect is
                in flight (billingLoading) or before the window navigates away */}
            {pendingTier && (
              <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-pw-primary/[0.08] border border-pw-primary/20 text-xs text-pw-primary font-medium">
                <span className="material-symbols-outlined text-sm animate-spin select-none">
                  progress_activity
                </span>
                Redirecting to billing — your tier will update once Stripe confirms the plan change.
              </div>
            )}

            {/* Current plan badge */}
            <p className="text-[10px] text-pw-muted text-center mt-1">
              Current plan:{' '}
              <span className="font-semibold text-pw-black">
                {plan === 'None' ? 'No active plan' : plan}
              </span>
            </p>
          </>
        )}

        {/* Team Features panel — gated on hasPlan('team') from Firestore,
            not on the Zustand accountTier value */}
        {isTeamTier && !profileLoading && (
          <div className="mt-5 border border-pw-border/50 rounded-xl p-4 bg-pw-glass-bg/30 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-pw-muted uppercase tracking-wider">
                Team Features Active
              </p>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-pw-primary/15 text-pw-primary border border-pw-primary/30">
                Team Plan
              </span>
            </div>
            <p className="text-xs text-pw-muted leading-relaxed">
              Invite up to 10 members, assign roles, and delegate projects across your organization.
              Team members are managed server-side — changes persist across devices and sessions.
            </p>
            <Link
              href="/dashboard/settings/team"
              className="flex items-center justify-between w-full h-10 px-5 rounded-lg border border-pw-border bg-pw-glass-bg hover:bg-pw-primary/5 hover:border-pw-primary/30 active:scale-98 transition-all text-sm font-medium text-pw-black cursor-pointer group"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-pw-primary select-none">
                  manage_accounts
                </span>
                Manage Team Members
              </span>
              <span className="material-symbols-outlined text-[16px] text-pw-muted group-hover:text-pw-primary transition-colors select-none">
                arrow_forward
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
