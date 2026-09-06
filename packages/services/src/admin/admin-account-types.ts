/** Platform account types admins may assign (matches RBAC matrix). */
export const ADMIN_ASSIGNABLE_ACCOUNT_TYPES = [
  'investor',
  'investment_team',
  'vendor',
  'admin',
] as const;

export type AdminAssignableAccountType = (typeof ADMIN_ASSIGNABLE_ACCOUNT_TYPES)[number];

export function normalizeAdminAssignableAccountType(value: unknown): AdminAssignableAccountType | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return (ADMIN_ASSIGNABLE_ACCOUNT_TYPES as readonly string[]).includes(normalized)
    ? (normalized as AdminAssignableAccountType)
    : null;
}

export function formatAccountTypeLabel(accountType: string | null | undefined): string {
  const normalized = (accountType || 'investor').trim().toLowerCase();
  switch (normalized) {
    case 'admin':
      return 'Platform Admin';
    case 'vendor':
      return 'Vendor';
    case 'investment_team':
      return 'Investment Team';
    case 'investor':
    default:
      return 'Investor';
  }
}
