import type { AuthUser, AuthorizationService } from '@paperworking/authz';
import { AuthzForbiddenError } from '@paperworking/authz';

/** Authoritative admin gate — Postgres-derived `isAdmin` only; never reads cookies or client flags. */
export function assertAdminUser(user: AuthUser, authz?: AuthorizationService): void {
  if (!user.isAdmin) {
    throw new AuthzForbiddenError({ error: 'Forbidden', reason: 'admin_required' });
  }
  authz?.assertPermission(user, 'admin.access');
}
