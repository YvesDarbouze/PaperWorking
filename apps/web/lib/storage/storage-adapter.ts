import { getAdminStorage } from '../firebase/admin';

export interface StorageUploadResult {
  docId: string;
  name: string;
  type: string;
  sizeBytes: number;
  downloadUrl: string;
  uploadedAt: string;
  category: string;
  folder: string;
}

export interface IStorageAdapter {
  readonly isConfigured: boolean;
  readonly providerName: string;
  upload(
    projectId: string,
    file: { name: string; type: string; sizeBytes: number; buffer: Uint8Array },
    category?: string,
  ): Promise<StorageUploadResult>;
  download(
    projectId: string,
    docId: string,
  ): Promise<{ content: Uint8Array; mimeType: string; fileName: string } | null>;
  getSignedDownloadUrl(
    projectId: string,
    docId: string,
    expiresInSeconds?: number,
  ): Promise<{ url: string; expiresAt: string } | null>;
  delete(projectId: string, docId: string): Promise<boolean>;
  list(projectId: string): Promise<StorageUploadResult[]>;
}

export function validateTaxComplianceDeletion(
  category: string,
  uploadedAtIso: string,
  currentDate: Date = new Date(),
): { canDelete: boolean; isTaxLocked: boolean; reason?: string } {
  const isTaxDoc =
    category.toLowerCase().includes('tax') ||
    category.toLowerCase().includes('closing') ||
    category.toLowerCase().includes('settlement') ||
    category.toLowerCase().includes('alta') ||
    category.toLowerCase().includes('hud');

  if (!isTaxDoc) {
    return { canDelete: true, isTaxLocked: false };
  }

  const uploaded = new Date(uploadedAtIso).getTime();
  const now = currentDate.getTime();
  const threeYearsMs = 3 * 365 * 24 * 60 * 60 * 1000;

  const ageMs = now - uploaded;
  if (ageMs < threeYearsMs) {
    const daysRemaining = Math.ceil((threeYearsMs - ageMs) / (1000 * 3600 * 24));
    return {
      canDelete: false,
      isTaxLocked: true,
      reason: `IRS compliance lock (26 U.S.C. § 6001): Real-estate closing settlement and tax basis documents cannot be permanently deleted for 3 years. ${daysRemaining} days remaining in statutory retention window. Document has been preserved pursuant to federal tax recordkeeping regulations.`,
    };
  }

  return { canDelete: true, isTaxLocked: false };
}

// In-Memory driver for automated testing and local execution without cloud bucket
export class MemoryStorageAdapter implements IStorageAdapter {
  readonly isConfigured = true;
  readonly providerName = 'Memory / Local Storage Driver';

  private files: Map<
    string,
    {
      docId: string;
      projectId: string;
      name: string;
      type: string;
      sizeBytes: number;
      category: string;
      folder: string;
      uploadedAt: string;
      buffer: Uint8Array;
    }
  > = new Map();

  async upload(
    projectId: string,
    file: { name: string; type: string; sizeBytes: number; buffer: Uint8Array },
    category: string = 'Contract / Paperwork',
  ): Promise<StorageUploadResult> {
    const docId = `doc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    const folder = resolveFolder(category, file.name);
    const uploadedAt = new Date().toISOString();

    this.files.set(`${projectId}:${docId}`, {
      docId,
      projectId,
      name: file.name,
      type: file.type || 'application/pdf',
      sizeBytes: file.sizeBytes,
      category,
      folder,
      uploadedAt,
      buffer: file.buffer,
    });

    return {
      docId,
      name: file.name,
      type: file.type || 'application/pdf',
      sizeBytes: file.sizeBytes,
      downloadUrl: `/api/projects/${projectId}/documents/${docId}`,
      uploadedAt,
      category,
      folder,
    };
  }

  async download(
    projectId: string,
    docId: string,
  ): Promise<{ content: Uint8Array; mimeType: string; fileName: string } | null> {
    const item = this.files.get(`${projectId}:${docId}`);
    if (!item) return null;
    return {
      content: item.buffer,
      mimeType: item.type,
      fileName: item.name,
    };
  }

  async getSignedDownloadUrl(
    projectId: string,
    docId: string,
    expiresInSeconds: number = 900,
  ): Promise<{ url: string; expiresAt: string } | null> {
    const item = this.files.get(`${projectId}:${docId}`);
    if (!item) return null;
    // Cap expiration strictly at <= 900 seconds (15 minutes)
    const ttl = Math.min(Math.max(expiresInSeconds, 60), 900);
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
    const url = `/api/projects/${projectId}/documents/${docId}?token=mock-signed-${docId}&expires=${encodeURIComponent(expiresAt)}`;
    return {
      url,
      expiresAt,
    };
  }

  async delete(projectId: string, docId: string): Promise<boolean> {
    return this.files.delete(`${projectId}:${docId}`);
  }

  async list(projectId: string): Promise<StorageUploadResult[]> {
    const results: StorageUploadResult[] = [];
    for (const item of this.files.values()) {
      if (item.projectId === projectId) {
        results.push({
          docId: item.docId,
          name: item.name,
          type: item.type,
          sizeBytes: item.sizeBytes,
          downloadUrl: `/api/projects/${projectId}/documents/${item.docId}`,
          uploadedAt: item.uploadedAt,
          category: item.category,
          folder: item.folder,
        });
      }
    }
    return results;
  }
}

// Cloud Storage driver (Firebase Storage / Google Cloud Storage)
export class CloudStorageAdapter implements IStorageAdapter {
  readonly providerName = 'Google Cloud / Firebase Storage';

  get isConfigured(): boolean {
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    return Boolean(bucketName && (process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT));
  }

  async upload(
    projectId: string,
    file: { name: string; type: string; sizeBytes: number; buffer: Uint8Array },
    category: string = 'Contract / Paperwork',
  ): Promise<StorageUploadResult> {
    if (!this.isConfigured) {
      throw new Error(
        'Cloud Storage is not configured. Set FIREBASE_STORAGE_BUCKET and service credentials (REQUIRES CREDENTIALS).',
      );
    }

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!;
    const storage = getAdminStorage();
    const bucket = storage.bucket(bucketName);
    const docId = `doc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    const storagePath = `projects/${projectId}/documents/${docId}/${file.name}`;
    const gcsFile = bucket.file(storagePath);

    await gcsFile.save(Buffer.from(file.buffer), {
      contentType: file.type || 'application/pdf',
      metadata: {
        projectId,
        docId,
        category,
      },
    });

    const folder = resolveFolder(category, file.name);
    const uploadedAt = new Date().toISOString();

    return {
      docId,
      name: file.name,
      type: file.type || 'application/pdf',
      sizeBytes: file.sizeBytes,
      downloadUrl: `/api/projects/${projectId}/documents/${docId}`,
      uploadedAt,
      category,
      folder,
    };
  }

  async download(
    projectId: string,
    docId: string,
  ): Promise<{ content: Uint8Array; mimeType: string; fileName: string } | null> {
    if (!this.isConfigured) {
      return null;
    }

    try {
      const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!;
      const storage = getAdminStorage();
      const bucket = storage.bucket(bucketName);
      const [files] = await bucket.getFiles({ prefix: `projects/${projectId}/documents/${docId}/` });
      if (files.length === 0) return null;

      const file = files[0];
      const [buffer] = await file.download();
      const [metadata] = await file.getMetadata();

      return {
        content: new Uint8Array(buffer),
        mimeType: metadata.contentType || 'application/octet-stream',
        fileName: file.name.split('/').pop() || 'document.pdf',
      };
    } catch {
      return null;
    }
  }

  async getSignedDownloadUrl(
    projectId: string,
    docId: string,
    expiresInSeconds: number = 900,
  ): Promise<{ url: string; expiresAt: string } | null> {
    if (!this.isConfigured) {
      return null;
    }

    try {
      const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!;
      const storage = getAdminStorage();
      const bucket = storage.bucket(bucketName);
      const [files] = await bucket.getFiles({ prefix: `projects/${projectId}/documents/${docId}/` });
      if (files.length === 0) return null;

      const file = files[0];
      // Cap expiration strictly at <= 900 seconds (15 minutes)
      const ttl = Math.min(Math.max(expiresInSeconds, 60), 900);
      const expires = Date.now() + ttl * 1000;
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires,
        version: 'v4',
      });

      return {
        url,
        expiresAt: new Date(expires).toISOString(),
      };
    } catch {
      return null;
    }
  }

  async delete(projectId: string, docId: string): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!;
      const storage = getAdminStorage();
      const bucket = storage.bucket(bucketName);
      const [files] = await bucket.getFiles({ prefix: `projects/${projectId}/documents/${docId}/` });
      for (const file of files) {
        await file.delete();
      }
      return true;
    } catch {
      return false;
    }
  }

  async list(projectId: string): Promise<StorageUploadResult[]> {
    if (!this.isConfigured) {
      return [];
    }

    try {
      const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!;
      const storage = getAdminStorage();
      const bucket = storage.bucket(bucketName);
      const [files] = await bucket.getFiles({ prefix: `projects/${projectId}/documents/` });

      return files.map((file) => {
        const parts = file.name.split('/');
        const docId = parts[3] || 'doc';
        const name = parts[parts.length - 1] || 'file';
        const category = (file.metadata as any)?.category || 'Other';
        return {
          docId,
          name,
          type: (file.metadata as any)?.contentType || 'application/pdf',
          sizeBytes: Number((file.metadata as any)?.size || 0),
          downloadUrl: `/api/projects/${projectId}/documents/${docId}`,
          uploadedAt: (file.metadata as any)?.timeCreated || new Date().toISOString(),
          category,
          folder: resolveFolder(category, name),
        };
      });
    } catch {
      return [];
    }
  }
}

function resolveFolder(category: string, fileName: string): string {
  const lower = (category + ' ' + fileName).toLowerCase();
  if (lower.includes('loan') || lower.includes('estimate') || lower.includes('lender') || lower.includes('debt') || lower.includes('appraisal')) {
    return 'Debt';
  }
  if (lower.includes('title') || lower.includes('escrow') || lower.includes('emd') || lower.includes('earnest') || lower.includes('insurance') || lower.includes('inspection')) {
    return 'Title & Insurance';
  }
  if (lower.includes('close') || lower.includes('settlement') || lower.includes('alta') || lower.includes('hud') || lower.includes('deed')) {
    return 'Closing';
  }
  if (lower.includes('equity') || lower.includes('subscription') || lower.includes('waterfall') || lower.includes('investor')) {
    return 'Equity';
  }
  return 'Capital Plan';
}

const globalStorage = globalThis as unknown as {
  __PW_STORAGE_ADAPTER?: IStorageAdapter;
};

export function getStorageAdapter(): IStorageAdapter {
  if (globalStorage.__PW_STORAGE_ADAPTER) {
    return globalStorage.__PW_STORAGE_ADAPTER;
  }

  // If driver explicitly set to memory/local, or in test environment, use MemoryStorageAdapter
  const forceMemory =
    process.env.STORAGE_DRIVER === 'memory' ||
    process.env.STORAGE_DRIVER === 'local' ||
    process.env.NODE_ENV === 'test';

  if (forceMemory) {
    globalStorage.__PW_STORAGE_ADAPTER = new MemoryStorageAdapter();
  } else {
    // Return CloudStorageAdapter (which checks credentials and reports isConfigured: false if missing)
    globalStorage.__PW_STORAGE_ADAPTER = new CloudStorageAdapter();
  }

  return globalStorage.__PW_STORAGE_ADAPTER;
}

export function __setStorageAdapterForTesting(adapter: IStorageAdapter | null): void {
  globalStorage.__PW_STORAGE_ADAPTER = adapter || undefined;
}
