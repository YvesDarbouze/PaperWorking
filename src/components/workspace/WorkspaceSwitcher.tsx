'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { Building2, UserCircle } from 'lucide-react';

export default function WorkspaceSwitcher() {
  const { user, profile } = useAuth();
  const { activeTenantId, switchTenant } = useTenant();

  if (!user || !profile) return null;

  // Derive list of workspaces
  const workspaces = [
    {
      id: profile.personalOrganizationId || `org_${user.uid.slice(0, 8)}`,
      name: 'Personal Workspace',
      type: 'personal',
    },
  ];

  if (profile.memberships) {
    Object.entries(profile.memberships).forEach(([tenantId, membership]) => {
      workspaces.push({
        id: tenantId,
        name: (membership as { tenantName?: string })?.tenantName || 'Team Workspace',
        type: 'team',
      });
    });
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    switchTenant(e.target.value);
  };

  const activeWorkspace = workspaces.find((w) => w.id === activeTenantId) || workspaces[0];

  return (
    <div className="px-5 py-3 border-b border-black/10 dark:border-white/10">
      <div className="relative">
        <select
          value={activeTenantId || workspaces[0].id}
          onChange={handleChange}
          aria-label="Select Workspace"
          className="w-full appearance-none bg-surface-container-low/60 border border-black/10 dark:border-white/5 text-on-surface text-xs font-bold uppercase tracking-wider py-2 pl-9 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow cursor-pointer truncate"
        >
          {workspaces.map((ws) => (
            <option key={ws.id} value={ws.id}>
              {ws.name}
            </option>
          ))}
        </select>
        
        {/* Decorative Icon inside select input */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
          {activeWorkspace.type === 'personal' ? (
            <UserCircle className="w-4 h-4" />
          ) : (
            <Building2 className="w-4 h-4" />
          )}
        </div>

        {/* Chevron */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
