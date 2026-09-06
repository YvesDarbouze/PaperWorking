export type IdentityProvider = 'firebase';

/** Verified identity from an IdP — authorization is applied separately via @paperworking/authz. */
export type VerifiedIdentity = {
  uid: string;
  email?: string;
  /** Firebase `name` claim / profile display name when present. */
  displayName?: string;
  provider: IdentityProvider;
};

export interface FirebaseIdentityVerifier {
  hasCredentials(): boolean;
  verifyIdToken(idToken: string): Promise<VerifiedIdentity>;
  verifySessionCookie(sessionCookie: string): Promise<VerifiedIdentity>;
  createSessionCookie(idToken: string, expiresInMs: number): Promise<string>;
}

export interface IdentityVerificationDeps {
  firebase?: FirebaseIdentityVerifier;
}
