import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';

describe('Firebase Client SDK: Browser Isolation & Singleton Idempotency', () => {
  const originalWindow = (global as any).window;

  beforeEach(() => {
    delete (global as any).window;
  });

  afterEach(() => {
    if (originalWindow !== undefined) {
      (global as any).window = originalWindow;
    } else {
      delete (global as any).window;
    }
  });

  it('server / SSR environment: returns null safely to protect SSR from client leaks', async () => {
    const {
      getFirebaseApp,
      getFirestoreDb,
      getFirebaseStorage,
      __resetFirebaseClientForTesting,
    } = await import('../../lib/firebase/client.js');

    __resetFirebaseClientForTesting();

    expect(getFirebaseApp()).toBeNull();
    expect(getFirestoreDb()).toBeNull();
    expect(getFirebaseStorage()).toBeNull();
  });

  it('browser environment: initializes and returns identical singleton instances (idempotency)', async () => {
    (global as any).window = {
      location: { hostname: 'localhost' },
    };

    const {
      getFirebaseApp,
      getFirestoreDb,
      getFirebaseStorage,
      __resetFirebaseClientForTesting,
    } = await import('../../lib/firebase/client.js');

    __resetFirebaseClientForTesting();

    // 1. App singleton
    const app1 = getFirebaseApp();
    const app2 = getFirebaseApp();
    expect(app1).not.toBeNull();
    expect(app1).toBe(app2);

    // 2. Firestore singleton
    const db1 = getFirestoreDb();
    const db2 = getFirestoreDb();
    expect(db1).not.toBeNull();
    expect(db1).toBe(db2);

    // 3. Storage singleton
    const storage1 = getFirebaseStorage();
    const storage2 = getFirebaseStorage();
    expect(storage1).not.toBeNull();
    expect(storage1).toBe(storage2);
  });
});
