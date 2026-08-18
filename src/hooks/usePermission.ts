'use client';

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AccountType, ActionKey, PermissionContext, hasPermission, getRequiredTierForAction } from '@/lib/permissions';

export function usePermission() {
  const { user } = useAuth();

  const accountType: AccountType = useMemo(() => {
    if (!user) return 'standard';
    const userRole = (user as any).account_type || (user as any).role || 'standard';
    const normalized = String(userRole).toLowerCase();

    if (normalized === 'team') return 'team';
    if (normalized === 'vendor') return 'vendor';
    if (normalized === 'investor') return 'investor';
    return 'standard';
  }, [user]);

  const can = (action: ActionKey, context: PermissionContext = {}): boolean => {
    return hasPermission(accountType, action, context);
  };

  const getRequiredTier = (action: ActionKey): string => {
    return getRequiredTierForAction(action);
  };

  return {
    accountType,
    can,
    getRequiredTier,
    isStandard: accountType === 'standard',
    isTeam: accountType === 'team',
    isVendor: accountType === 'vendor',
    isInvestor: accountType === 'investor',
  };
}
