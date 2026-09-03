import type { AuthUser } from '@paperworking/authz';

/** DB-authoritative admin gate — never reads __acct or other display cookies. */
export function isAuthorizedAdmin(
  authUser: AuthUser | null,
): authUser is AuthUser & { isAdmin: true } {
  return authUser !== null && authUser.isAdmin === true;
}
