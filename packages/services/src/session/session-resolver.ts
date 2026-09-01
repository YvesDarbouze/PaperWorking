import type { AuthUser } from '@paperworking/authz';
import { verifyAccessToken } from '@paperworking/identity';
import { buildAuthUserForUid } from './build-auth-user.js';
import type { SessionCredentials, SessionResolverDeps } from './types.js';

function pickAccessToken(credentials: SessionCredentials): string | undefined {
  const bearer = credentials.bearerToken?.trim();
  if (bearer) return bearer;
  const session = credentials.sessionCookie?.trim();
  if (session) return session;
  return undefined;
}

/**
 * Verify token via @paperworking/identity and resolve DB-authoritative AuthUser.
 * Returns null when credentials are missing or invalid (Nest-compatible semantics).
 */
export async function resolveAuthUserFromAccessToken(
  accessToken: string | undefined | null,
  deps: SessionResolverDeps,
): Promise<AuthUser | null> {
  if (!accessToken?.trim()) return null;
  try {
    const identity = await verifyAccessToken(accessToken, deps.identity);
    return await buildAuthUserForUid(identity.uid, deps.store);
  } catch {
    return null;
  }
}

export async function resolveAuthUserFromCredentials(
  credentials: SessionCredentials,
  deps: SessionResolverDeps,
): Promise<AuthUser | null> {
  const token = pickAccessToken(credentials);
  if (!token) return null;
  return resolveAuthUserFromAccessToken(token, deps);
}
