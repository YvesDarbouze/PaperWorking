import type { AdminAuthContext } from '@paperworking/api';
import { isAuthorizedAdmin, resolveServerAuthUser } from '@/lib/api/server-session';

export type DevAdminAuthResult = AdminAuthContext | { status: number; body: unknown };

export async function requireDevAdminAuth(): Promise<DevAdminAuthResult> {
  const authUser = await resolveServerAuthUser();
  if (!authUser) {
    return { status: 401, body: { error: 'Unauthorized' } };
  }

  // DB-authoritative isAdmin only — __acct cookie must not grant admin access.
  if (!isAuthorizedAdmin(authUser)) {
    return { status: 403, body: { error: 'Admin access required' } };
  }

  return {
    uid: authUser.uid,
    role: authUser.role ?? 'admin',
    isAdmin: true,
  };
}

export function isDevAdminAuthFailure(
  result: DevAdminAuthResult,
): result is { status: number; body: unknown } {
  return 'status' in result && 'body' in result;
}
