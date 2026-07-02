'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface Tenant {
  id: string;
  role: string;
  isPersonal: boolean;
}

interface TenantContextType {
  activeTenantId: string | null;
  switchTenant: (tenantId: string) => void;
  availableTenants: Tenant[];
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) {
      setActiveTenantId(null);
      return;
    }

    // Determine default tenant
    const savedTenant = window.localStorage.getItem('pw_active_tenant_id');
    const validTenants = [
      profile.personalOrganizationId,
      ...(profile.memberships ? Object.keys(profile.memberships) : []),
      profile.organizationId // fallback for legacy
    ].filter(Boolean) as string[];

    if (savedTenant && validTenants.includes(savedTenant)) {
      setActiveTenantId(savedTenant);
    } else if (profile.personalOrganizationId) {
      setActiveTenantId(profile.personalOrganizationId);
    } else if (profile.organizationId) {
      setActiveTenantId(profile.organizationId);
    } else {
      // Fallback if somehow none exist. uid can be missing on legacy/partial
      // docs — never dereference it blindly or the provider throws.
      const seed = profile.uid || profile.personalOrganizationId || 'unknown';
      setActiveTenantId(`org_${seed.slice(0, 8)}`);
    }
  }, [profile]);

  const switchTenant = (tenantId: string) => {
    setActiveTenantId(tenantId);
    window.localStorage.setItem('pw_active_tenant_id', tenantId);
  };

  const availableTenants = React.useMemo(() => {
    if (!profile) return [];
    
    const tenants: Tenant[] = [];
    
    if (profile.personalOrganizationId) {
      tenants.push({
        id: profile.personalOrganizationId,
        role: profile.orgRole || 'Owner',
        isPersonal: true
      });
    } else if (profile.organizationId) { // legacy fallback
      tenants.push({
        id: profile.organizationId,
        role: profile.orgRole || 'Owner',
        isPersonal: true
      });
    }

    if (profile.memberships) {
      Object.entries(profile.memberships).forEach(([id, role]) => {
        // Prevent duplicating personal org if it's somehow in memberships
        if (id !== profile.personalOrganizationId && id !== profile.organizationId) {
          tenants.push({
            id,
            role: typeof role === 'string' ? role : 'Member',
            isPersonal: false
          });
        }
      });
    }

    return tenants;
  }, [profile]);

  return (
    <TenantContext.Provider value={{ activeTenantId, switchTenant, availableTenants }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
