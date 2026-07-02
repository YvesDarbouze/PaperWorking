'use client';

import React from 'react';
import { useUserStore } from '@/store/userStore';
import type { OrgRole } from '@/types/schema';

/* ═══════════════════════════════════════════════════════
   OrgRoleSelector — Account-Level Role Self-Designation

   Allows the account holder to declare themselves as
   'Lead Investor' (default) or 'Admin'. This persists
   in `users/{uid}.orgRole` on Firestore.
   ═══════════════════════════════════════════════════════ */

const roles: { key: OrgRole; label: string; description: string; materialIcon: string }[] = [
  {
    key: 'Lead Investor',
    label: 'Lead Investor',
    description: 'Full ownership of deal pipeline, finances, and team management.',
    materialIcon: 'shield',
  },
  {
    key: 'Admin',
    label: 'Admin',
    description: 'Co-admin access with delegated authority from the Lead Investor.',
    materialIcon: 'manage_accounts',
  },
];

export default function OrgRoleSelector() {
  const orgRole = useUserStore((s) => s.orgRole);
  const setOrgRole = useUserStore((s) => s.setOrgRole);

  return (
    <div className="glass-card glass-card-bright rounded-2xl overflow-hidden relative flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-pw-border/50">
        <h3 className="font-label-md text-label-md font-bold text-pw-black tracking-tight flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-pw-primary select-none">shield</span>
          Organization Role
        </h3>
        <p className="text-xs text-pw-muted mt-0.5">Designate your account-level authority.</p>
      </div>

      {/* Role Toggle Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {roles.map((r) => {
            const active = orgRole === r.key;
            return (
              <button
                key={r.key}
                onClick={() => setOrgRole(r.key)}
                className={`relative p-4 rounded-xl border transition-all duration-200 text-left cursor-pointer ${
                  active
                    ? 'border-pw-primary/45 bg-pw-primary/10 text-pw-black shadow-[0_0_15px_rgba(69,73,85,0.15)]'
                    : 'border-pw-border bg-pw-glass-bg/50 text-pw-muted hover:border-pw-muted/40'
                }`}
              >
                {active && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-pw-primary/20 border border-pw-primary/30 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-[12px] text-pw-primary font-bold select-none">check</span>
                  </div>
                )}
                <div className="w-10 h-10 bg-pw-glass-bg border border-pw-border rounded-lg flex items-center justify-center mb-3 text-pw-primary">
                  <span className="material-symbols-outlined text-xl select-none">{r.materialIcon}</span>
                </div>
                <p className="font-body-md text-body-md font-bold text-pw-black">{r.label}</p>
                <p className="font-label-sm text-label-sm text-pw-muted mt-1.5 leading-relaxed">
                  {r.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Footer info / Active designation */}
        <div className="mt-6 pt-4 border-t border-pw-border/50 flex items-center justify-between">
          <span className="font-label-sm text-label-sm font-bold text-pw-muted uppercase tracking-widest">Active Designation</span>
          <span className="font-label-sm text-label-sm font-semibold text-pw-black flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-pw-primary animate-pulse" />
            {orgRole}
          </span>
        </div>
      </div>
    </div>
  );
}

