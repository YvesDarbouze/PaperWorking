'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMetricSnapshots } from '@/hooks/useMetricSnapshots';

const PLAN_LIMITS_GB: Record<string, number> = {
  'Individual': 5.0,
  'Team': 50.0,
  'Vendor Network': 10.0,
  'None': 1.0,
};

export function CloudStorageMeter() {
  const { profile } = useAuth();
  const { snapshots } = useMetricSnapshots(1);

  const plan = profile?.subscriptionPlan ?? 'None';
  const limitGB = PLAN_LIMITS_GB[plan] || 1.0;
  
  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const totalSizeBytes = latestSnapshot ? latestSnapshot.storageUsageBytes : 0;

  const usageGB = totalSizeBytes / (1024 * 1024 * 1024);
  const usagePercent = Math.min((usageGB / limitGB) * 100, 100);
  const isNearLimit = usagePercent > 90;

  // Glass theme colors
  const trackColor = "var(--color-glass-bg)";
  const fillColor = isNearLimit ? "var(--color-error)" : "var(--color-primary)";

  return (
    <section className="glass-card glass-card-bright p-6 sm:p-8 flex flex-col rounded-2xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-pw-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-base select-none">storage</span>
          Cloud Storage Meter
        </h2>
      </div>

      <div className="mb-4 flex items-end justify-between">
        <div>
          <span className="text-3xl font-light text-pw-black">
            {usageGB.toFixed(2)} GB
          </span>
          <span className="text-sm text-pw-muted ml-2 font-body-md">
            of {limitGB.toFixed(0)} GB total
          </span>
        </div>
        <span className={`text-xs font-bold tracking-wider ${isNearLimit ? 'text-error' : 'text-pw-muted'}`}>
          {usagePercent.toFixed(1)}% CAPACITY
        </span>
      </div>

      {/* Progress Bar with glow effect */}
      <div 
        className="w-full h-2 overflow-hidden mb-6 border border-pw-border bg-pw-glass-bg rounded-full"
      >
        <div 
          className="h-full transition-all duration-700 ease-in-out rounded-full"
          style={{ 
            width: `${usagePercent}%`, 
            backgroundColor: fillColor,
            boxShadow: isNearLimit ? '0 0 10px rgba(186, 26, 26, 0.4)' : '0 0 10px rgba(69, 73, 85, 0.3)'
          }}
        />
      </div>

      {isNearLimit ? (
        <div className="flex items-start gap-3 bg-error/10 border border-error/20 p-4 mb-6 rounded-xl">
          <span className="material-symbols-outlined text-xl text-error flex-shrink-0 select-none">warning</span>
          <div className="flex-1">
            <p className="text-xs font-bold text-error">Storage Threshold Warning</p>
            <p className="text-[11px] text-pw-muted mt-1 leading-relaxed">
              Your organization has consumed over 90% of its storage allocation. 
              To prevent document upload interruptions, please upgrade to a higher tier.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-pw-muted mb-6 leading-relaxed max-w-2xl font-medium font-body-sm">
          The Cloud Storage Meter aggregates all transactional documents, legal contracts, 
          and financial disclosures stored across your project vaults.
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-stack-md">
        {isNearLimit && (
          <button 
            className="luminous-button px-6 py-3 rounded-xl font-label-md text-label-md font-bold cursor-pointer flex items-center justify-center gap-2"
          >
            Upgrade Capacity 
            <span className="material-symbols-outlined text-sm select-none">arrow_forward</span>
          </button>
        )}
        <button 
          className="px-6 py-3 rounded-xl font-label-md text-label-md font-bold border border-white/10 hover:bg-white/5 transition-all cursor-pointer text-pw-black shadow-sm flex items-center justify-center"
        >
          View Document Audit
        </button>
      </div>
    </section>
  );
}

