import { cookies } from 'next/headers';
import { isValidSessionToken, verifySessionToken } from '@paperworking/api';
import { SESSION_COOKIE } from '@/lib/auth/session-cookies';
import { resolveServerAuthUser } from '@/lib/api/server-session';
import { normalizeToStructuredError } from '@paperworking/shared';

/**
 * Resolves the caller from either:
 *  - the HMAC dev/mock session token (v0 dev flows, TEST_AUTH_UID), or
 *  - the real Firebase session cookie issued by /api/auth/session (Admin verified).
 */
async function resolveUnifiedSession(): Promise<{ uid: string; organizationId?: string } | null> {
  try {
    const cookieStore = await cookies();
    const orgCookie = cookieStore.get('pw_org_id')?.value;
    const session = cookieStore.get(SESSION_COOKIE)?.value;

    if (session && isValidSessionToken(session)) {
      const verified = verifySessionToken(session);
      const uid = verified?.uid ?? 'dev-user-1';
      return {
        uid,
        organizationId: orgCookie || (uid.includes('beta') ? 'org-beta' : 'org-1'),
      };
    }

    const user = await resolveServerAuthUser();
    if (user) {
      return { uid: user.uid, organizationId: orgCookie || undefined };
    }
    return null;
  } catch {
    return null;
  }
}

export type DevAuthResult =
  | { uid: string; organizationId?: string }
  | { status: number; body: unknown };

export async function requireDevSessionAuth(): Promise<DevAuthResult> {
  if (process.env.TEST_AUTH_UID) {
    if (process.env.TEST_AUTH_UID === 'unauthenticated') {
      return { status: 401, body: normalizeToStructuredError('Unauthorized', 401) };
    }
    const orgId =
      process.env.TEST_AUTH_ORG ||
      (process.env.TEST_AUTH_UID.includes('beta') ? 'org-beta' : 'org-1');
    return { uid: process.env.TEST_AUTH_UID, organizationId: orgId };
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
