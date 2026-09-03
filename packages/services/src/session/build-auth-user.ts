import type { AuthUser } from '@paperworking/authz';
import { isPlatformAdminUser } from './account-type.js';
import type { PostgresUserProfile } from './types.js';

/**
 * Build AuthUser from authoritative Postgres data only.
 * Cookies, request body accountType, and client roles MUST NOT be used here.
 */
export function buildAuthUserFromPostgresUser(
  user: PostgresUserProfile | null,
  uid: string,
): AuthUser {
  const dbAccountType = (user?.accountType || 'investor').trim().toLowerCase();
  const isAdmin = isPlatformAdminUser(user || {});

  let accountType = 'investor';
  if (isAdmin) accountType = 'admin';
  else if (dbAccountType === 'vendor') accountType = 'vendor';
  else if (dbAccountType === 'investment_team') accountType = 'investment_team';
  else accountType = 'investor';

  return {
    uid: user?.id || uid,
    email: user?.email,
    accountType,
    isAdmin,
    role: user?.role,
  };
}

export async function buildAuthUserForUid(
  uid: string,
  store: { findUserByUid(uid: string): Promise<PostgresUserProfile | null> },
): Promise<AuthUser> {
  const user = await store.findUserByUid(uid);
  return buildAuthUserFromPostgresUser(user, uid);
}
