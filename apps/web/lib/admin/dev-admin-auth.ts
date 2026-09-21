import type { AdminAuthContext } from '@paperworking/api';
import {
  isAuthorizedAdmin,
  resolveAuthUserFromRequest,
  resolveServerAuthUser,
} from '@/lib/api/server-session';

export type DevAdminAuthResult = AdminAuthContext | { status: number; body: unknown };

/** Test-only bearer stubs — never accepted in production. */
const DEV_MOCK_ADMIN_TOKENS = new Set(['mock-admin-token', 'valid-admin-token']);

export async function requireDevAdminAuth(request?: Request): Promise<DevAdminAuthResult> {
  if (process.env.NODE_ENV !== 'production' && request) {
    const token = request.headers
      .get('authorization')
      ?.replace(/^bearer\s+/i, '')
      .trim();
    if (token && DEV_MOCK_ADMIN_TOKENS.has(token)) {
      return { uid: 'admin-test-uid', role: 'admin', isAdmin: true };
    }
  }

  const authUser = request
    ? await resolveAuthUserFromRequest(request)
    : await resolveServerAuthUser();
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
