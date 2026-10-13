import { cookies } from 'next/headers';
import { isValidSessionToken, verifySessionToken } from '@paperworking/api';
import { ACCT_COOKIE, SESSION_COOKIE } from '@/lib/auth/session-cookies';
import { resolveServerAuthUser } from '@/lib/api/server-session';
import { normalizeToStructuredError } from '@paperworking/shared';

/**
 * Resolves the caller from either:
 *  - the HMAC dev/mock session token (v0 dev flows, TEST_AUTH_UID), or
 *  - the real Firebase session cookie issued by /api/auth/session (Admin verified).
 */
async function resolveUnifiedSession(): Promise<{
  uid: string;
  organizationId?: string;
  accountType?: string;
} | null> {
  try {
    const cookieStore = await cookies();
    const orgCookie = cookieStore.get('pw_org_id')?.value;
    const acctCookie = cookieStore.get(ACCT_COOKIE)?.value;
    const session = cookieStore.get(SESSION_COOKIE)?.value;

    if (session && isValidSessionToken(session)) {
      const verified = verifySessionToken(session);
      const uid = verified?.uid ?? 'dev-user-1';
      return {
        uid,
        organizationId: orgCookie || (uid.includes('beta') ? 'org-beta' : 'org-1'),
        accountType:
          acctCookie ||
          (verified as { accountType?: string } | null)?.accountType ||
          (uid.includes('vendor') ? 'vendor' : 'investor'),
      };
    }

    const user = await resolveServerAuthUser();
    if (user) {
      return {
        uid: user.uid,
        organizationId: orgCookie || undefined,
        accountType:
          acctCookie ||
          (user as { accountType?: string }).accountType ||
          (user.uid.includes('vendor') ? 'vendor' : 'investor'),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export type DevAuthResult =
  | { uid: string; organizationId?: string; accountType?: string }
  | { status: number; body: unknown };

export async function requireDevSessionAuth(): Promise<DevAuthResult> {
  if (process.env.TEST_AUTH_UID) {
    if (process.env.TEST_AUTH_UID === 'unauthenticated') {
      return { status: 401, body: normalizeToStructuredError('Unauthorized', 401) };
    }
    const orgId =
      process.env.TEST_AUTH_ORG ||
      (process.env.TEST_AUTH_UID.includes('beta') ? 'org-beta' : 'org-1');
    const accountType =
      process.env.TEST_AUTH_ACCOUNT_TYPE ||
      (process.env.TEST_AUTH_UID.includes('vendor') ? 'vendor' : 'investor');
    return { uid: process.env.TEST_AUTH_UID, organizationId: orgId, accountType };
  }

  const resolved = await resolveUnifiedSession();
  if (!resolved) {
    return { status: 401, body: normalizeToStructuredError('Unauthorized', 401) };
  }
  return resolved;
}

export function isDevAuthFailure(
  result: DevAuthResult,
): result is { status: number; body: unknown } {
  return 'status' in result && 'body' in result;
}

export async function tryDevSessionAuth(): Promise<{ uid: string } | null> {
  if (process.env.TEST_AUTH_UID) {
    if (process.env.TEST_AUTH_UID === 'unauthenticated') return null;
    return { uid: process.env.TEST_AUTH_UID };
  }

  const resolved = await resolveUnifiedSession();
  return resolved ? { uid: resolved.uid } : null;
}
