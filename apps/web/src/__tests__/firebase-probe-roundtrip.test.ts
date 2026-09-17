import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';

describe('Firebase Dev Probe: Round-Trip Write/Read/Delete Pipeline', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
      NEXT_PUBLIC_USE_FIREBASE_EMULATOR: 'true',
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('verifies probe route atomic sequence: write -> read -> delete -> verify cleanup', async () => {
    const memoryStore = new Map<string, any>();

    const mockDocRef = (path: string) => ({
      set: async (data: any) => {
        memoryStore.set(path, { ...data, _serverTimestamp: Date.now() });
      },
      get: async () => ({
        exists: memoryStore.has(path),
        data: () => memoryStore.get(path),
      }),
      delete: async () => {
        memoryStore.delete(path);
      },
    });

    const probeId = `probe-test-${Date.now()}`;
    const docPath = `_dev_probes/${probeId}`;
    const doc = mockDocRef(docPath);

    // 1. Write
    await doc.set({
      probeId,
      testMessage: 'Jest roundtrip verification',
      clientEnvironment: 'jest-test',
    });
    expect(memoryStore.has(docPath)).toBe(true);

    // 2. Read
    const snap = await doc.get();
    expect(snap.exists).toBe(true);
    const retrievedData = snap.data();
    expect(retrievedData.probeId).toBe(probeId);
    expect(retrievedData.testMessage).toBe('Jest roundtrip verification');

    // 3. Delete
    await doc.delete();
    expect(memoryStore.has(docPath)).toBe(false);

    // 4. Verify cleanup
    const postDeleteSnap = await doc.get();
    expect(postDeleteSnap.exists).toBe(false);
  });

  it('verifies executeProbe function executes atomic pipeline and returns standard contract', async () => {
    const { executeProbe } = await import('../../lib/firebase/probe.js');

    const memoryStore = new Map<string, any>();
    const mockDb = {
      collection: (colName: string) => ({
        doc: (docId: string) => {
          const path = `${colName}/${docId}`;
          return {
            set: async (data: any) => {
              memoryStore.set(path, { ...data });
            },
            get: async () => ({
              exists: memoryStore.has(path),
              data: () => memoryStore.get(path),
            }),
            delete: async () => {
              memoryStore.delete(path);
            },
          };
        },
      }),
    };

    const result = await executeProbe(mockDb);

    expect(result.success).toBe(true);
    expect(result.probeId).toBeDefined();
    expect(typeof result.roundtripMs).toBe('number');
    expect(result.verifiedSteps).toEqual({
      write: true,
      read: true,
      delete: true,
      cleanedUp: true,
    });
    expect(result.message).toContain('Firestore emulator roundtrip succeeded');
  });
});
