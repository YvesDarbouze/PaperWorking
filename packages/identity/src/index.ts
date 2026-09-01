export {
  isFirebaseAuthEnabled,
  isFirebaseAuthEmulator,
  IDENTITY_PACKAGE_STATUS,
} from './config.js';
export {
  peekTokenIssuer,
  isFirebaseIssuedToken,
  isSupabaseIssuedToken,
} from './jwt-routing.js';
export {
  createFirebaseIdentityVerifier,
  firebaseAdminHasCredentials,
  getFirebaseAuth,
  resetFirebaseAuthForTests,
} from './firebase-verifier.js';
export {
  createSupabaseIdentityVerifier,
  supabaseHasCredentials,
  resetSupabaseClientForTests,
} from './supabase-verifier.js';
export {
  verifyAccessToken,
  verifyAccessTokenDefault,
  createDefaultIdentityDeps,
  IdentityVerificationError,
} from './identity-router.js';
export type {
  VerifiedIdentity,
  IdentityProvider,
  FirebaseIdentityVerifier,
  SupabaseIdentityVerifier,
  IdentityVerificationDeps,
} from './types.js';
