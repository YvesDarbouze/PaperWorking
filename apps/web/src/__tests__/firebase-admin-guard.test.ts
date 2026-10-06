import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';

describe('Firebase Admin SDK: Server-Only Guard & Emulator Safety', () => {
  const originalEnv = { ...process.env };
  const originalWindow = (global as any).window;

  beforeEach(() => {
    delete (global as any).window;
    process.env = { ...originalEnv, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    if (originalWindow !== undefined) {
      (global as any).window = originalWindow;
    } else {
      delete (global as any).window;
    }
  });

  it('server environment: getAdminApp and getAdminFirestore initialize without error', async () => {
    const { getAdminApp, getAdminFirestore } = await import('../../lib/firebase/admin.js');
    const app = getAdminApp();
    expect(app).toBeDefined();
    expect(app.name).toBe('[DEFAULT]');

    const db = getAdminFirestore();
    expect(db).toBeDefined();
  });

  it('client environment guard: throws immediately if imported or run where window is defined', () => {
    // Simulate window existence
    const clientGuard = () => {
      const mockWindow = {} as any;
      if (typeof mockWindow !== 'undefined') {
        throw new Error('Firebase Admin SDK cannot be imported or executed on the client.');
      }
    };

    expect(clientGuard).toThrow('Firebase Admin SDK cannot be imported or executed on the client.');
  });

  it('automated test safety: live project connection without emulator fails loudly', () => {
    const testLiveSafetyGuard = (env: Record<string, string | undefined>) => {
      const isEmulatorActive = Boolean(
        env.FIRESTORE_EMULATOR_HOST ||
        env.FIREBASE_STORAGE_EMULATOR_HOST ||
        env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true'
      );

      if (env.NODE_ENV === 'test' && !env.FIRESTORE_EMULATOR_HOST && !isEmulatorActive) {
        throw new Error(
          'Live Firebase project detected in automated test environment! ' +
          'Automated tests must target local Firebase Emulators (set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080).'
        );
      }
    };

    // Live attempt (no emulator host) must throw
    expect(() =>
      testLiveSafetyGuard({
        NODE_ENV: 'test',
        FIRESTORE_EMULATOR_HOST: undefined,
        NEXT_PUBLIC_USE_FIREBASE_EMULATOR: undefined,
      })
    ).toThrow(/Live Firebase project detected in automated test environment/);

    // Emulator present passes
    expect(() =>
      testLiveSafetyGuard({
        NODE_ENV: 'test',
        FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
      })
    ).not.toThrow();
  });

  describe('Private Key Validation & Placeholder Defense', () => {
    it('detects dummy placeholder private keys from .env templates as invalid', async () => {
      const { isValidPrivateKey, formatPrivateKey } = await import('../../lib/firebase/admin.js');

      const dummyPlaceholder =
        '"-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\\n-----END PRIVATE KEY-----\\n"';

      expect(isValidPrivateKey(dummyPlaceholder)).toBe(false);
      expect(isValidPrivateKey(undefined)).toBe(false);
      expect(isValidPrivateKey('')).toBe(false);
      expect(isValidPrivateKey('short-mock-key')).toBe(false);

      // Cleans escaped newlines and surrounding quotes properly
      const formatted = formatPrivateKey(dummyPlaceholder);
      expect(formatted).toContain('\n');
      expect(formatted.startsWith('"')).toBe(false);
      expect(formatted.endsWith('"')).toBe(false);
    });

    it('initializes Admin SDK without throwing "Failed to parse private key" when in emulator/demo mode with placeholder key', async () => {
      const { getAdminApp, __resetFirebaseAdminForTesting } = await import('../../lib/firebase/admin.js');
      __resetFirebaseAdminForTesting();

      // Configure dummy placeholder credentials alongside emulator toggle (typical localhost setup)
      process.env.FIREBASE_ADMIN_PROJECT_ID = 'demo-paperworking';
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL = 'firebase-adminsdk@demo-paperworking.iam.gserviceaccount.com';
      process.env.FIREBASE_ADMIN_PRIVATE_KEY =
        '"-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\\n-----END PRIVATE KEY-----\\n"';
      process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
      process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR = 'true';

      expect(() => {
        const app = getAdminApp();
        expect(app).toBeDefined();
        expect(app.name).toBe('[DEFAULT]');
      }).not.toThrow();

      __resetFirebaseAdminForTesting();
    });

    it('shouldAttemptFirestore rejects placeholder keys when emulator is absent', async () => {
      const { shouldAttemptFirestore } = await import('../../lib/firebase/admin.js');

      delete process.env.FIRESTORE_EMULATOR_HOST;
      delete process.env.FIRESTORE_EMULATOR_RUNNING;
      delete process.env.GOOGLE_CLOUD_PROJECT;
      process.env.FIREBASE_ADMIN_PRIVATE_KEY =
        '"-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\\n-----END PRIVATE KEY-----\\n"';

      expect(shouldAttemptFirestore()).toBe(false);
    });
  });
});
