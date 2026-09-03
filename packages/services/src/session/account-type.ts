/**
 * Client-supplied account type normalization for first-time provisioning only.
 * Admin is NEVER accepted from the client — platform admin is DB-assigned only.
 */
export function normalizeClientAccountType(value: unknown): string {
  if (typeof value !== 'string') return 'investor';
  const n = value.trim().toLowerCase();
  if (n === 'admin') return 'investor';
  if (n === 'vendor') return 'vendor';
  if (n === 'investment_team') return 'investment_team';
  return 'investor';
}

export function isPlatformAdminUser(user: {
  accountType?: string | null;
  role?: string | null;
}): boolean {
  return (
    (user.accountType || '').trim().toLowerCase() === 'admin' ||
    (user.role || '').trim().toLowerCase() === 'admin'
  );
}
