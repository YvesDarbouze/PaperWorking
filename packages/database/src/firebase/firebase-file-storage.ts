import type { App } from 'firebase-admin/app';
import type { FileStoragePort } from '../storage/file-storage-port.js';

let storageApp: App | null = null;

function resolveProjectId(): string | undefined {
  return (
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim()
  );
}

function resolveStorageBucket(): string | undefined {
  const raw =
    process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  if (!raw) return undefined;
  return raw.replace(/^gs:\/\//, '').replace(/\/+$/, '');
}

function resolveClientEmail(): string | undefined {
  return process.env.FIREBASE_CLIENT_EMAIL?.trim();
}

function resolvePrivateKey(): string | undefined {
  const raw = process.env.FIREBASE_PRIVATE_KEY;
  if (!raw) return undefined;
  return raw
    .trim()
    .replace(/^['"]/, '')
    .replace(/['"],?\s*$/, '')
    .replace(/\\n/g, '\n');
}

function isGcpRuntime(): boolean {
  return Boolean(process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT);
}

export function firebaseStorageHasCredentials(): boolean {
  const projectId = resolveProjectId();
  const bucket = resolveStorageBucket();
  if (!projectId || !bucket) return false;
  if (resolveClientEmail() && resolvePrivateKey()) return true;
  return isGcpRuntime();
}

/** Exported for deployment preflight — never logs secret values. */
export function resolveFirebaseStorageConfig(): {
  projectId: string | undefined;
  bucket: string | undefined;
  credentialMode: 'explicit_service_account' | 'adc' | 'none';
} {
  const projectId = resolveProjectId();
  const bucket = resolveStorageBucket();
  let credentialMode: 'explicit_service_account' | 'adc' | 'none' = 'none';
  if (resolveClientEmail() && resolvePrivateKey()) {
    credentialMode = 'explicit_service_account';
  } else if (isGcpRuntime()) {
    credentialMode = 'adc';
  }
  return { projectId, bucket, credentialMode };
}

async function getStorageApp(): Promise<App> {
  if (storageApp) return storageApp;

  const { initializeApp, getApps, cert, applicationDefault } = await import('firebase-admin/app');
  const projectId = resolveProjectId();
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID is required for Firebase Storage');
  }

  const existing = getApps()[0];
  if (existing) {
    storageApp = existing;
    return existing;
  }

  const clientEmail = resolveClientEmail();
  const privateKey = resolvePrivateKey();

  if (clientEmail && privateKey) {
    storageApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
      storageBucket: resolveStorageBucket(),
    });
    return storageApp;
  }

  if (isGcpRuntime()) {
    storageApp = initializeApp({
      credential: applicationDefault(),
      projectId,
      storageBucket: resolveStorageBucket(),
    });
    return storageApp;
  }

  throw new Error('Firebase Storage credentials not configured');
}

/** Firebase Storage adapter — server-side only via Admin SDK. */
export function createFirebaseFileStorage(): FileStoragePort {
  return {
    async putObject(input) {
      const { getStorage } = await import('firebase-admin/storage');
      const app = await getStorageApp();
      const bucketName = resolveStorageBucket();
      if (!bucketName) throw new Error('FIREBASE_STORAGE_BUCKET is required');
      const bucket = getStorage(app).bucket(bucketName);
      await bucket.file(input.key).save(input.data, {
        contentType: input.contentType,
        resumable: false,
        metadata: { cacheControl: 'private, max-age=0' },
      });
    },

    async deleteObject(input) {
      const { getStorage } = await import('firebase-admin/storage');
      const app = await getStorageApp();
      const bucketName = resolveStorageBucket();
      if (!bucketName) throw new Error('FIREBASE_STORAGE_BUCKET is required');
      await getStorage(app).bucket(bucketName).file(input.key).delete({ ignoreNotFound: true });
    },

    async getSignedDownloadUrl(input) {
      const { getStorage } = await import('firebase-admin/storage');
      const app = await getStorageApp();
      const bucketName = resolveStorageBucket();
      if (!bucketName) throw new Error('FIREBASE_STORAGE_BUCKET is required');
      const ttlSec = input.ttlSec ?? 900;
      const [url] = await getStorage(app)
        .bucket(bucketName)
        .file(input.key)
        .getSignedUrl({
          action: 'read',
          expires: Date.now() + ttlSec * 1000,
        });
      return url;
    },

    async objectExists(input) {
      const { getStorage } = await import('firebase-admin/storage');
      const app = await getStorageApp();
      const bucketName = resolveStorageBucket();
      if (!bucketName) throw new Error('FIREBASE_STORAGE_BUCKET is required');
      const [exists] = await getStorage(app).bucket(bucketName).file(input.key).exists();
      return exists;
    },
  };
}

export function resetFirebaseStorageForTests(): void {
  storageApp = null;
}
