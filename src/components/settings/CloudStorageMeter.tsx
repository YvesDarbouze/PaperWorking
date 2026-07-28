'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMetricSnapshots } from '@/hooks/useMetricSnapshots';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { billingTokens, panelStyle } from '@/components/settings/billingTheme';

const PLAN_LIMITS_GB: Record<string, number> = {
  'Individual': 5.0,
  'Team': 50.0,
  'Vendor Network': 10.0,
  'None': 1.0,
};

export function CloudStorageMeter() {
  const { profile } = useAuth();
  const { snapshots } = useMetricSnapshots(1);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const t = billingTokens(isDark);
  const panel = panelStyle(t);

  const plan = profile?.subscriptionPlan ?? 'None';
  const limitGB = PLAN_LIMITS_GB[plan] || 1.0;

  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const totalSizeBytes = latestSnapshot ? latestSnapshot.storageUsageBytes : 0;

  const usageGB = totalSizeBytes / (1024 * 1024 * 1024);
  const usagePercent = Math.min((usageGB / limitGB) * 100, 100);
  const isNearLimit = usagePercent > 90;

  const fillColor = isNearLimit ? t.alert : t.accent;

  return (
    <section className="p-5 sm:p-6 flex flex-col" style={panel}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: t.heading }}>
          <span className="material-symbols-outlined text-[16px] select-none" style={{ color: t.accent }}>storage</span>
          Cloud storage
        </h2>
      </div>

      <div className="mb-4 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <span className="text-3xl font-semibold tabular-nums" style={{ color: t.heading }}>
            {usageGB.toFixed(2)} GB
          </span>
          <span className="text-sm ml-2 font-medium" style={{ color: t.muted }}>
            of {limitGB.toFixed(0)} GB
          </span>
        </div>
        <span
          className="text-xs font-semibold tracking-wider tabular-nums"
          style={{ color: isNearLimit ? t.alert : t.muted }}
        >
          {usagePercent.toFixed(1)}% capacity
        </span>
      </div>

      <div
        className="w-full h-1.5 overflow-hidden mb-5"
        style={{ border: `1px solid ${t.border}`, background: t.surfaceHigh, borderRadius: 1 }}
      >
        <div
          className="h-full transition-all duration-700 ease-in-out"
          style={{
            width: `${usagePercent}%`,
            backgroundColor: fillColor,
            borderRadius: 1,
          }}
        />
      </div>

      {isNearLimit ? (
        <div
          className="flex items-start gap-3 p-4 mb-5"
          style={{ background: t.alertMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}
        >
          <span className="material-symbols-outlined text-xl flex-shrink-0 select-none" style={{ color: t.alert }}>warning</span>
          <div className="flex-1">
            <p className="text-xs font-semibold" style={{ color: t.alert }}>Storage threshold warning</p>
            <p className="text-[11px] mt-1 leading-relaxed" style={{ color: t.muted }}>
              Over 90% of allocation used. Upgrade to avoid upload interruptions.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs mb-5 leading-relaxed max-w-2xl" style={{ color: t.muted }}>
          Aggregates documents, contracts, and disclosures stored across project vaults.
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-2.5">
        {isNearLimit && (
          <button
            type="button"
            className="pw-interactive-custom flex items-center justify-center gap-2 text-sm font-semibold"
            style={{ background: t.ctaBg, color: t.ctaFg, border: 'none', borderRadius: 2, padding: '8px 16px' }}
          >
            Upgrade capacity
            <span className="material-symbols-outlined text-[16px] select-none">arrow_forward</span>
          </button>
        )}
        <button
          type="button"
          className="pw-interactive-custom flex items-center justify-center text-sm font-semibold"
          style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 2, padding: '8px 16px', color: t.heading }}
        >
          View document audit
        </button>
      </div>
    </section>
  );
}
