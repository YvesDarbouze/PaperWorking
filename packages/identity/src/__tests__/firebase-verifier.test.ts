import { afterEach, describe, expect, it } from '@jest/globals';
import {
  firebaseAdminHasCredentials,
  resetFirebaseAuthForTests,
} from '../firebase-verifier.js';

describe('firebaseAdminHasCredentials (v0 ADC parity)', () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
    resetFirebaseAuthForTests();
  });

  it('returns true on Cloud Run / App Hosting via K_SERVICE even without private key', () => {
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
    process.env.FIREBASE_PROJECT_ID = 'paperworking-97055';
    process.env.K_SERVICE = 'paperworker';

    expect(firebaseAdminHasCredentials()).toBe(true);
  });

  it('returns true with explicit service account env vars', () => {
    process.env.FIREBASE_PROJECT_ID = 'paperworking-97055';
    process.env.FIREBASE_CLIENT_EMAIL = 'firebase-adminsdk@test.iam.gserviceaccount.com';
    process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----';

    expect(firebaseAdminHasCredentials()).toBe(true);
  });

  it('returns false locally without explicit key or GCP runtime', () => {
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
    delete process.env.K_SERVICE;
    delete process.env.GOOGLE_CLOUD_PROJECT;
    process.env.FIREBASE_PROJECT_ID = 'paperworking-97055';

    expect(firebaseAdminHasCredentials()).toBe(false);
  });
});
