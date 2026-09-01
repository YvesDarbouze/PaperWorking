import { afterEach, describe, expect, it } from '@jest/globals';
import {
  firebaseStorageHasCredentials,
  resolveFirebaseStorageConfig,
  resetFirebaseStorageForTests,
} from '../firebase-file-storage.js';
import { createUnavailableFileStorage } from '../../storage/unavailable-file-storage.js';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  resetFirebaseStorageForTests();
});

describe('firebase storage config resolution', () => {
  it('normalizes gs:// bucket prefix from public env', () => {
    process.env.FIREBASE_PROJECT_ID = 'paperworking-97055';
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'gs://paperworking-97055.firebasestorage.app';
    process.env.K_SERVICE = 'paperworker';

    const config = resolveFirebaseStorageConfig();
    expect(config.bucket).toBe('paperworking-97055.firebasestorage.app');
    expect(firebaseStorageHasCredentials()).toBe(true);
  });

  it('prefers server FIREBASE_STORAGE_BUCKET over public fallback', () => {
    process.env.FIREBASE_PROJECT_ID = 'paperworking-97055';
    process.env.FIREBASE_STORAGE_BUCKET = 'paperworking-97055.firebasestorage.app';
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'other-bucket';

    expect(resolveFirebaseStorageConfig().bucket).toBe('paperworking-97055.firebasestorage.app');
  });

  it('fails closed when bucket env is missing', () => {
    process.env.FIREBASE_PROJECT_ID = 'paperworking-97055';
    delete process.env.FIREBASE_STORAGE_BUCKET;
    delete process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

    expect(firebaseStorageHasCredentials()).toBe(false);
    expect(resolveFirebaseStorageConfig().bucket).toBeUndefined();
  });
});

describe('unavailable file storage', () => {
  it('rejects all mutating operations without synthetic success', async () => {
    const storage = createUnavailableFileStorage('Firebase Storage is not configured');
    await expect(storage.putObject({ key: 'a', data: Buffer.from('x'), contentType: 'text/plain' }))
      .rejects.toThrow(/not configured/i);
    await expect(storage.getSignedDownloadUrl({ key: 'a' })).rejects.toThrow(/not configured/i);
  });
});
