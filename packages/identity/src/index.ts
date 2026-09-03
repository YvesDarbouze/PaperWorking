export {
  isFirebaseAuthEnabled,
  isFirebaseAuthEmulator,
  IDENTITY_PACKAGE_STATUS,
} from './config.js';
export {
  peekTokenIssuer,
  isFirebaseIssuedToken,
  isFirebaseSessionCookieToken,
  isSupabaseIssuedToken,
} from './jwt-routing.js';
export {
  createFirebaseIdentityVerifier,
  firebaseAdminHasCredentials,
  getFirebaseAuth,
  resetFirebaseAuthForTests,
} from './firebase-verifier.js';
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
  IdentityVerificationDeps,
} from './types.js';
