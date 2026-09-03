import type { AuthUser } from '@paperworking/authz';
import type { VerifiedIdentity } from '@paperworking/identity';

export const SESSION_COOKIE = '__session';
export const ACCT_COOKIE = '__acct';
export const SUB_COOKIE = '__sub';
export const SESSION_ID_COOKIE = '__session_id';

/** Framework-neutral cookie write instruction — adapters apply to Express/Next. */
export type SessionCookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'none' | 'strict';
  path?: string;
  maxAge?: number;
};

export type CookieDescriptor = {
  name: string;
  value: string;
  options: SessionCookieOptions;
};

export type SubscriptionSnapshot = {
  plan: string;
  status: string;
} | null;

export type SubscriptionLookup = {
  findForUserId(userId: string): Promise<SubscriptionSnapshot>;
};

export type IdentityUserRow = {
  id: string;
  email: string;
  accountType?: string | null;
  role?: string | null;
  legacyFirebaseUid?: string | null;
};

/** Repository port for authoritative Neon user identity provisioning. */
export type IdentityUserRepository = {
  findById(id: string): Promise<IdentityUserRow | null>;
  findByLegacyUid(uid: string): Promise<IdentityUserRow | null>;
  findByEmail(email: string): Promise<IdentityUserRow | null>;
  updateEmail(id: string, email: string): Promise<void>;
  updateAfterEmailRemap(
    id: string,
    data: { email: string; legacyFirebaseUid: string | null },
  ): Promise<void>;
  createUser(data: { id: string; email: string; accountType: string }): Promise<void>;
  remapPrimaryKey(oldId: string, newId: string): Promise<void>;
};

export type IdentityProvisioningService = {
  provisionFromVerifiedIdentity(
    verified: VerifiedIdentity,
    accountType: string,
  ): Promise<AuthUser>;
};

export type SessionCookiePolicyKind = 'nest' | 'next';

export type EstablishSessionSuccess = {
  ok: true;
  authUser: AuthUser;
  uid: string;
  cookies: CookieDescriptor[];
};

export type EstablishSessionFailure = {
  ok: false;
  status: 400 | 401 | 503;
  body: unknown;
};

export type EstablishSessionResult = EstablishSessionSuccess | EstablishSessionFailure;
