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
  const trackColor = "rgba(255, 255, 255, 0.05)";
  const fillColor = isNearLimit ? "#ef4444" : "#57f1db";

  return (
    <section className="glass-card p-6 sm:p-8 flex flex-col mt-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md relative overflow-hidden">
      <div className="flex items-center gap-2 mb-6 text-[#57f1db]">
        <span className="material-symbols-outlined text-lg select-none">storage</span>
        <h2 className="text-xs font-bold uppercase tracking-widest">
          Cloud Storage Meter
        </h2>
      </div>

      <div className="mb-4 flex items-end justify-between">
        <div>
          <span className="text-3xl font-light text-white">
            {usageGB.toFixed(2)} GB
          </span>
          <span className="text-sm text-[#8a9b9b] ml-2">
            of {limitGB.toFixed(0)} GB total
          </span>
        </div>
        <span className={`text-xs font-bold tracking-wider ${isNearLimit ? 'text-red-400' : 'text-[#8a9b9b]'}`}>
          {usagePercent.toFixed(1)}% CAPACITY
        </span>
      </div>

      {/* Progress Bar with glow effect */}
      <div 
        className="w-full h-3 overflow-hidden mb-6 border border-white/5" 
        style={{ backgroundColor: trackColor, borderRadius: '6px' }}
      >
        <div 
          className="h-full transition-all duration-700 ease-in-out"
          style={{ 
            width: `${usagePercent}%`, 
            backgroundColor: fillColor,
            boxShadow: isNearLimit ? '0 0 10px rgba(239, 68, 68, 0.4)' : '0 0 10px rgba(87, 241, 219, 0.3)'
          }}
        />
      </div>

      {isNearLimit ? (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 p-4 mb-6 rounded-xl">
          <span className="material-symbols-outlined text-xl text-red-400 flex-shrink-0 select-none">warning</span>
          <div className="flex-1">
            <p className="text-xs font-bold text-red-400">Storage Threshold Warning</p>
            <p className="text-[11px] text-[#8a9b9b] mt-1 leading-relaxed">
              Your organization has consumed over 90% of its storage allocation. 
              To prevent document upload interruptions, please upgrade to a higher tier.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[#8a9b9b] mb-6 leading-relaxed max-w-2xl font-medium">
          The Cloud Storage Meter aggregates all transactional documents, legal contracts, 
          and financial disclosures stored across your project vaults.
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        {isNearLimit && (
          <button 
            className="luminous-button inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider px-6 py-3 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 rounded-lg transition"
          >
            Upgrade Capacity 
            <span className="material-symbols-outlined text-sm select-none">arrow_forward</span>
          </button>
        )}
        <button 
          className="inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider px-6 py-3 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-lg transition"
        >
          View Document Audit
        </button>
      </div>
    </section>
  );
}

