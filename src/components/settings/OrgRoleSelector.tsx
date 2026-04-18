'use client';

import React from 'react';
import { useUserStore } from '@/store/userStore';
import { Shield, UserCog } from 'lucide-react';
import type { OrgRole } from '@/types/schema';

/* ═══════════════════════════════════════════════════════
   OrgRoleSelector — Account-Level Role Self-Designation

   Allows the account holder to declare themselves as
   'Lead Investor' (default) or 'Admin'. This persists
   in `users/{uid}.orgRole` on Firestore.
   ═══════════════════════════════════════════════════════ */

const roles: { key: OrgRole; label: string; description: string; icon: React.ReactNode }[] = [
  {
    key: 'Lead Investor',
    label: 'Lead Investor',
    description: 'Full ownership of deal pipeline, finances, and team management.',
    icon: <Shield className="w-4 h-4" />,
  },
  {
    key: 'Admin',
    label: 'Admin',
    description: 'Co-admin access with delegated authority from the Lead Investor.',
    icon: <UserCog className="w-4 h-4" />,
  },
];

export default function OrgRoleSelector() {
  const orgRole = useUserStore((s) => s.orgRole);
  const setOrgRole = useUserStore((s) => s.setOrgRole);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-1 tracking-tight">Organization Role</h3>
      <p className="text-xs text-gray-500 mb-5">Designate your account-level authority.</p>

      <div className="flex gap-3">
        {roles.map((r) => {
          const active = orgRole === r.key;
          return (
            <button
              key={r.key}
              onClick={() => setOrgRole(r.key)}
              className={`flex-1 p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                active
                  ? 'border-indigo-600 bg-indigo-50/60 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className={`flex items-center gap-2 mb-2 ${active ? 'text-indigo-700' : 'text-gray-500'}`}>
                {r.icon}
                <span className="text-xs font-bold uppercase tracking-widest">{r.label}</span>
              </div>
              <p className={`text-sm leading-relaxed ${active ? 'text-indigo-600' : 'text-gray-400'}`}>
                {r.description}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Active Designation</span>
        <span className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          {orgRole}
        </span>
      </div>
    </div>
  );
}
