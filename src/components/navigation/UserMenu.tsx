import React from 'react';
import type { AccountType } from '@/types/user';

export const tierLabels: Record<AccountType, string> = {
  investor: 'Investor',
  investment_team: 'Investment Team',
  vendor: 'Vendor',
  admin: 'Admin',
};

export const tierColors: Record<AccountType, string> = {
  investor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  investment_team: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  vendor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  admin: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export function UserMenuBadge({ accountType = 'investor' }: { accountType?: AccountType }) {
  const label = tierLabels[accountType] || 'Investor';
  const color = tierColors[accountType] || tierColors.investor;

  return (
    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${color}`}>
      {label}
    </span>
  );
}

export default UserMenuBadge;
