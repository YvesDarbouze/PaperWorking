import type { AuthUser } from '@paperworking/authz';
import type { IdentityVerificationDeps } from '@paperworking/identity';

export type { AuthUser };

export type PostgresUserProfile = {
  id: string;
  email?: string | null;
  accountType?: string | null;
  role?: string | null;
  legacyFirebaseUid?: string | null;
};

export type SessionUserStore = {
  findUserByUid(uid: string): Promise<PostgresUserProfile | null>;
};

export type SessionResolverDeps = {
  identity: IdentityVerificationDeps;
  store: SessionUserStore;
};

export type SessionCredentials = {
  /** HttpOnly __session cookie value */
  sessionCookie?: string | null;
  /** Authorization: Bearer token */
  bearerToken?: string | null;
};
