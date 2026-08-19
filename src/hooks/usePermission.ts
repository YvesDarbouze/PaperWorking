'use client';

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AccountType, ActionKey, PermissionContext, hasPermission, getRequiredTierForAction } from '@/lib/permissions';

export function usePermission() {
  const { user } = useAuth();

  const accountType: AccountType = useMemo(() => {
    if (!user) return 'investor';
    const userRole = (user as any).accountType || (user as any).account_type || (user as any).role || 'investor';
    const normalized = String(userRole).toLowerCase();

    if (normalized === 'investment_team' || normalized === 'team') return 'investment_team';
    if (normalized === 'vendor') return 'vendor';
    if (normalized === 'admin') return 'admin';
    return 'investor';
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
    isInvestor: accountType === 'investor',
    isInvestmentTeam: accountType === 'investment_team',
    isTeam: accountType === 'investment_team',
    isVendor: accountType === 'vendor',
    isAdmin: accountType === 'admin',
  };
}
