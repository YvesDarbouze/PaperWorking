import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/auth/session-cookies';

export type DevAuthResult = { uid: string } | { status: number; body: unknown };

export async function requireDevSessionAuth(): Promise<DevAuthResult> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  if (!session) {
    return { status: 401, body: { error: 'Unauthorized' } };
  }
  return { uid: 'dev-user-1' };
}

export function isDevAuthFailure(
  result: DevAuthResult,
): result is { status: number; body: unknown } {
  return 'status' in result && 'body' in result;
}

export async function tryDevSessionAuth(): Promise<{ uid: string } | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  if (!session) return null;
  return { uid: 'dev-user-1' };
}
