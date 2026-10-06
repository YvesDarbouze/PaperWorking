import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';

const MANAGED_KEYS = [
  'NODE_ENV',
  'FIRESTORE_EMULATOR_HOST',
  'FIRESTORE_EMULATOR_RUNNING',
  'FIREBASE_ADMIN_PRIVATE_KEY',
  'GOOGLE_CLOUD_PROJECT',
  'GCLOUD_PROJECT',
  'K_SERVICE',
  'FIREBASE_APP_HOSTING',
] as const;

describe('shouldAttemptFirestore: managed runtime detection', () => {
  const originalEnv = { ...process.env };
  const originalWindow = (global as any).window;

  beforeEach(() => {
    delete (global as any).window;
    process.env = { ...originalEnv };
    for (const key of MANAGED_KEYS) {
      delete (process.env as Record<string, string | undefined>)[key];
    }
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    if (originalWindow !== undefined) {
      (global as any).window = originalWindow;
    } else {
      delete (global as any).window;
    }
  });

  async function loadShouldAttemptFirestore() {
    const { shouldAttemptFirestore } = await import('../../lib/firebase/admin.js');
    return shouldAttemptFirestore;
  }

  it('returns true on Cloud Run / App Hosting (K_SERVICE) in production', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.K_SERVICE = 'paperworker';
    const shouldAttemptFirestore = await loadShouldAttemptFirestore();
    expect(shouldAttemptFirestore()).toBe(true);
  });

  it('returns true with GOOGLE_CLOUD_PROJECT in production', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.GOOGLE_CLOUD_PROJECT = 'paperworking-97055';
    const shouldAttemptFirestore = await loadShouldAttemptFirestore();
    expect(shouldAttemptFirestore()).toBe(true);
  });

  it('returns true with FIREBASE_APP_HOSTING in production', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.FIREBASE_APP_HOSTING = 'true';
    const shouldAttemptFirestore = await loadShouldAttemptFirestore();
    expect(shouldAttemptFirestore()).toBe(true);
  });

  it('returns false in production without runtime or credential signals', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    const shouldAttemptFirestore = await loadShouldAttemptFirestore();
    expect(shouldAttemptFirestore()).toBe(false);
  });

  it('returns false in tests without emulator', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    const shouldAttemptFirestore = await loadShouldAttemptFirestore();
    expect(shouldAttemptFirestore()).toBe(false);
  });

  it('returns true in tests with emulator host', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    const shouldAttemptFirestore = await loadShouldAttemptFirestore();
    expect(shouldAttemptFirestore()).toBe(true);
  });
});
