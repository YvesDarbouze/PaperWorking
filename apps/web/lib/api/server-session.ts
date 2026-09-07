import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AuthUser } from '@paperworking/authz';
import {
  buildAuthUserForUid,
  readCookieFromHeader,
  resolveAuthUserFromCredentials,
} from '@paperworking/services';
import { SESSION_COOKIE, DEV_MOCK_SESSION_TOKEN } from '@/lib/auth/session-cookies';
import { buildHandlerDeps, type HandlerDeps } from './handler-deps';

export { isAuthorizedAdmin } from './admin-gate';

const DEV_MOCK_UID = '00000000-0000-4000-8000-000000000001';

function mockAuthEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  const mockAuthFlag = process.env.ENABLE_MOCK_AUTH;
  if (mockAuthFlag === 'true' || mockAuthFlag === '1') return true;
  if (mockAuthFlag === 'false' || mockAuthFlag === '0') return false;
  const useMockFlag = process.env.USE_MOCK_DATA;
  if (useMockFlag === 'false' || useMockFlag === '0') return false;
  return process.env.NODE_ENV === 'test' || useMockFlag === 'true' || useMockFlag === '1';
}

function isMockSessionValue(token: string): boolean {
  return (
    token.startsWith('mock:') ||
    token === DEV_MOCK_SESSION_TOKEN ||
    token.startsWith('mock_session')
  );
}

async function resolveMockSessionUser(deps: HandlerDeps): Promise<AuthUser | null> {
  if (process.env.NODE_ENV === 'production') return null;
  return buildAuthUserForUid(DEV_MOCK_UID, deps.sessionResolver.store);
}

export type ServerSessionCredentials = {
  sessionCookie?: string | null;
  bearerToken?: string | null;
};

export function sessionCredentialsFromRequest(request: Request): ServerSessionCredentials {
  const cookieHeader = request.headers.get('cookie');
  const sessionCookie = readCookieFromHeader(cookieHeader, SESSION_COOKIE);
  const authorization = request.headers.get('authorization');
  const bearerToken =
    authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : undefined;
  return { sessionCookie, bearerToken };
}

export async function resolveAuthUserFromRequest(
  request: Request,
  deps: HandlerDeps = buildHandlerDeps(),
): Promise<AuthUser | null> {
  const credentials = sessionCredentialsFromRequest(request);
  const token = credentials.bearerToken ?? credentials.sessionCookie;
  if (token && isMockSessionValue(token) && process.env.NODE_ENV !== 'production') {
    return resolveMockSessionUser(deps);
  }
  return resolveAuthUserFromCredentials(
    credentials,
    deps.sessionResolver,
  );
}

/**
 * Resolve AuthUser from Next server context (cookies + Authorization header).
 * Uses shared @paperworking/services session resolver + Firestore profile.
 */
export async function resolveServerAuthUser(
  credentials?: ServerSessionCredentials,
): Promise<AuthUser | null> {
  const deps = buildHandlerDeps();

  let sessionCookie = credentials?.sessionCookie;
  let bearerToken = credentials?.bearerToken;

  if (sessionCookie === undefined || bearerToken === undefined) {
    const cookieStore = await cookies();
    const headerStore = await headers();
    if (sessionCookie === undefined) {
      sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;
    }
    if (bearerToken === undefined) {
      const authorization = headerStore.get('authorization');
      bearerToken =
        authorization?.startsWith('Bearer ')
          ? authorization.slice('Bearer '.length).trim()
          : undefined;
    }
  }

  const token = bearerToken ?? sessionCookie;
  if (token && isMockSessionValue(token) && process.env.NODE_ENV !== 'production') {
    return resolveMockSessionUser(deps);
  }

  return resolveAuthUserFromCredentials(
    { sessionCookie, bearerToken },
    deps.sessionResolver,
  );
}

/** Server Component gate — redirects when the session cookie is missing or invalid. */
export async function requireServerAuthUser(
  redirectTo = '/login?reason=session_expired',
): Promise<AuthUser> {
  const user = await resolveServerAuthUser();
  if (!user) {
    redirect(redirectTo);
  }
  return user;
}
