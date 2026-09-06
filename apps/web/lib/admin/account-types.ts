/** Admin UI labels for platform account types (mirrors services admin-account-types). */
export const ADMIN_ACCOUNT_TYPE_OPTIONS = [
  { value: 'investor', label: 'Investor' },
  { value: 'investment_team', label: 'Investment Team' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'admin', label: 'Platform Admin' },
] as const;

export function formatAdminAccountTypeLabel(accountType: string | null | undefined): string {
  const normalized = (accountType || 'investor').trim().toLowerCase();
  return (
    ADMIN_ACCOUNT_TYPE_OPTIONS.find((option) => option.value === normalized)?.label ?? 'Investor'
  );
}
