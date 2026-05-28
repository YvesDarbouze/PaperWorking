import React from 'react';

export default function PerformanceMetrics() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="glass-card rounded-xl p-6 light-leak">
        <div className="flex justify-between items-start mb-4">
          <span className="text-on-surface-variant font-label-md uppercase tracking-wider">Total Portfolio Value</span>
          <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
        </div>
        <div className="jetbrains-mono text-3xl font-bold text-on-surface">$2.8M</div>
        <div className="mt-2 flex items-center gap-2 text-primary">
          <span className="material-symbols-outlined text-sm">trending_up</span>
          <span className="text-xs font-label-sm">+12.4% vs LY</span>
        </div>
      </div>
      <div className="glass-card rounded-xl p-6">
        <div className="flex justify-between items-start mb-4">
          <span className="text-on-surface-variant font-label-md uppercase tracking-wider">IRR</span>
          <span className="material-symbols-outlined text-primary">analytics</span>
        </div>
        <div className="jetbrains-mono text-3xl font-bold text-on-surface">18.2%</div>
        <div className="mt-2 flex items-center gap-2 text-primary">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          <span className="text-xs font-label-sm">Above Target (15%)</span>
        </div>
      </div>
      <div className="glass-card rounded-xl p-6">
        <div className="flex justify-between items-start mb-4">
          <span className="text-on-surface-variant font-label-md uppercase tracking-wider">CoC Return</span>
          <span className="material-symbols-outlined text-primary">currency_exchange</span>
        </div>
        <div className="jetbrains-mono text-3xl font-bold text-on-surface">7.4%</div>
        <div className="mt-2 flex items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-sm">schedule</span>
          <span className="text-xs font-label-sm">Updated 2h ago</span>
        </div>
      </div>
    </div>
  );
}
