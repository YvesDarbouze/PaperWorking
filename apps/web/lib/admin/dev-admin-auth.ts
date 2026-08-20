import { cookies } from 'next/headers';
import type { AdminAuthContext } from '@paperworking/api';
import { ACCT_COOKIE, SESSION_COOKIE } from '@/lib/auth/session-cookies';

export type DevAdminAuthResult = AdminAuthContext | { status: number; body: unknown };

export async function requireDevAdminAuth(): Promise<DevAdminAuthResult> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  if (!session) {
    return { status: 401, body: { error: 'Unauthorized' } };
  }

  const accountType = cookieStore.get(ACCT_COOKIE)?.value ?? 'investor';
  if (accountType !== 'admin') {
    return { status: 403, body: { error: 'Admin access required' } };
  }

  return {
    uid: 'dev-admin-1',
    role: 'admin',
    isAdmin: true,
  };
}

export function isDevAdminAuthFailure(
  result: DevAdminAuthResult,
): result is { status: number; body: unknown } {
  return 'status' in result && 'body' in result;
}
