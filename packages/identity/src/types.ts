export type IdentityProvider = 'firebase' | 'supabase';

/** Verified identity from an IdP — authorization is applied separately via @paperworking/authz. */
export type VerifiedIdentity = {
  uid: string;
  email?: string;
  provider: IdentityProvider;
};

export interface FirebaseIdentityVerifier {
  hasCredentials(): boolean;
  verifyIdToken(idToken: string): Promise<VerifiedIdentity>;
  verifySessionCookie(sessionCookie: string): Promise<VerifiedIdentity>;
  createSessionCookie(idToken: string, expiresInMs: number): Promise<string>;
}

export interface SupabaseIdentityVerifier {
  hasCredentials(): boolean;
  verifyAccessToken(accessToken: string): Promise<VerifiedIdentity>;
}

export interface IdentityVerificationDeps {
  firebase?: FirebaseIdentityVerifier;
  supabase?: SupabaseIdentityVerifier;
}
