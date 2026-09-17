import { cookies } from 'next/headers';
import { isValidSessionToken, verifySessionToken } from '@paperworking/api';
import { SESSION_COOKIE } from '@/lib/auth/session-cookies';
import { normalizeToStructuredError } from '@paperworking/shared';

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

  try {
    const cookieStore = await cookies();
    const orgCookie = cookieStore.get('pw_org_id')?.value;
    const session = cookieStore.get(SESSION_COOKIE)?.value;
    if (!session || !isValidSessionToken(session)) {
      return { status: 401, body: normalizeToStructuredError('Unauthorized', 401) };
    }
    const verified = verifySessionToken(session);
    const uid = verified?.uid ?? 'dev-user-1';
    const orgId = orgCookie || (uid.includes('beta') ? 'org-beta' : 'org-1');
    return { uid, organizationId: orgId };
  } catch {
    return { status: 401, body: normalizeToStructuredError('Unauthorized', 401) };
  }
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

  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE)?.value;
    if (!session || !isValidSessionToken(session)) return null;
    const verified = verifySessionToken(session);
    return { uid: verified?.uid ?? 'dev-user-1' };
  } catch {
    return null;
  }
}
