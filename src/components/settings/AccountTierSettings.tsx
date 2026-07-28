'use client';

import React from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useBilling } from '@/hooks/useBilling';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { billingTokens, panelStyle } from '@/components/settings/billingTheme';

/* AccountTierSettings — Individual vs Team toggle (UI only changes) */

export default function AccountTierSettings() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const t = billingTokens(isDark);
  const panel = panelStyle(t);

  const {
    plan,
    hasPlan,
    isSubscribed,
    openPortal,
    startCheckout,
    isLoading: billingLoading,
  } = useBilling();

  const [pendingTier, setPendingTier] = React.useState<'Individual' | 'Team' | null>(null);

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
        await openPortal();
      } else {
        await startCheckout(targetTier === 'Team' ? 'Investment Team' : 'Investor');
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err instanceof Error ? err.message : 'Failed to initiate plan change.');
      setPendingTier(null);
    }
  };

  const tierCard = (key: 'Individual' | 'Team', title: string, desc: string, icon: string) => {
    const active = accountTier === key;
    return (
      <button
        type="button"
        onClick={() => handleTierChange(key)}
        disabled={isTransitioning}
        className="pw-interactive-custom relative p-4 text-left transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          borderRadius: 2,
          border: `1px solid ${active ? t.accent : t.border}`,
          background: active ? t.accentMuted : t.surfaceMuted,
          color: t.body,
          padding: 16,
        }}
      >
        {pendingTier === key && billingLoading ? (
          <div className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center">
            <span className="material-symbols-outlined text-sm animate-spin select-none" style={{ color: t.accent }}>
              progress_activity
            </span>
          </div>
        ) : active ? (
          <div
            className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center"
            style={{ background: t.accentMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}
          >
            <span className="material-symbols-outlined text-[12px] font-bold select-none" style={{ color: t.accent }}>
              check
            </span>
          </div>
        ) : null}
        <div
          className="w-9 h-9 flex items-center justify-center mb-3"
          style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 2, color: t.accent }}
        >
          <span className="material-symbols-outlined text-xl select-none">{icon}</span>
        </div>
        <p className="text-sm font-semibold" style={{ color: t.heading }}>{title}</p>
        <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: t.muted }}>
          {desc}
        </p>
      </button>
    );
  };

  return (
    <div className="overflow-hidden flex flex-col" style={panel}>
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
        <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: t.heading }}>
          <span className="material-symbols-outlined text-[16px] select-none" style={{ color: t.accent }}>shield</span>
          Account tier
        </h3>
        <p className="text-xs mt-0.5" style={{ color: t.muted }}>
          Controls team size and collaboration features.
        </p>
      </div>

      <div className="p-5">
        {profileLoading ? (
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="p-4 animate-pulse h-28"
                style={{ border: `1px solid ${t.border}`, background: t.surfaceMuted, borderRadius: 2 }}
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {tierCard('Individual', 'Individual', 'Single operator. You manage all projects solo.', 'person')}
              {tierCard('Team', 'Team', 'Up to 10 members. Delegate projects and assign roles.', 'group')}
            </div>

            {pendingTier && (
              <div
                className="mb-4 flex items-center gap-2 px-3 py-2 text-xs font-medium"
                style={{ background: t.accentMuted, border: `1px solid ${t.border}`, borderRadius: 2, color: t.accent }}
              >
                <span className="material-symbols-outlined text-sm animate-spin select-none">
                  progress_activity
                </span>
                Redirecting to billing — tier updates after Stripe confirms.
              </div>
            )}

            <p className="text-[10px] text-center mt-1" style={{ color: t.muted }}>
              Current plan:{' '}
              <span className="font-semibold" style={{ color: t.heading }}>
                {plan === 'None' ? 'No active plan' : plan}
              </span>
            </p>
          </>
        )}

        {isTeamTier && !profileLoading && (
          <div
            className="mt-5 p-4 space-y-3"
            style={{ border: `1px solid ${t.border}`, borderRadius: 2, background: t.surfaceMuted }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: t.muted }}>
                Team features active
              </p>
              <span
                className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                style={{ background: t.accentMuted, color: t.accent, border: `1px solid ${t.border}`, borderRadius: 2 }}
              >
                Team plan
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: t.muted }}>
              Invite up to 10 members, assign roles, and delegate projects. Team changes persist server-side.
            </p>
            <Link
              href="/dashboard/settings/team"
              className="flex items-center justify-between w-full text-sm font-semibold group"
              style={{
                border: `1px solid ${t.border}`,
                background: t.surface,
                borderRadius: 2,
                padding: '8px 14px',
                color: t.heading,
              }}
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] select-none" style={{ color: t.accent }}>
                  manage_accounts
                </span>
                Manage team members
              </span>
              <span className="material-symbols-outlined text-[16px] select-none" style={{ color: t.muted }}>
                arrow_forward
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
