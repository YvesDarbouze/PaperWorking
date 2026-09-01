import { cookies, headers } from 'next/headers';
import type { AuthUser } from '@paperworking/authz';
import { readCookieFromHeader, resolveAuthUserFromCredentials } from '@paperworking/services';
import { SESSION_COOKIE } from '@/lib/auth/session-cookies';
import { buildHandlerDeps, type HandlerDeps } from './handler-deps';

export { isAuthorizedAdmin } from './admin-gate';

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
  return resolveAuthUserFromCredentials(
    sessionCredentialsFromRequest(request),
    deps.sessionResolver,
  );
}

/**
 * Resolve AuthUser from Next server context (cookies + Authorization header).
 * Uses shared @paperworking/services session resolver + Postgres profile.
 */
export async function resolveServerAuthUser(
  credentials?: ServerSessionCredentials,
): Promise<AuthUser | null> {
  if (!process.env.DATABASE_URL?.trim()) {
    return null;
  }

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

  return resolveAuthUserFromCredentials(
    { sessionCookie, bearerToken },
    deps.sessionResolver,
  );
}
