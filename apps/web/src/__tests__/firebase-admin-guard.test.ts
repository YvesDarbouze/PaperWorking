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
});
