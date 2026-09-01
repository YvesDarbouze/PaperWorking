import type { AuthorizationService, AuthUser } from '@paperworking/authz';
import { AuthzNotFoundError } from '@paperworking/authz';
import type { FileStoragePort } from '../storage/file-storage-port.js';
import { assertStorageKeyBelongsToProject } from './document-upload-validation.js';
import { ProjectDocumentsStorageError } from './project-documents-errors.js';
import type { ProjectDocumentsRepository } from './project-documents-repository.js';

export const DEFAULT_DOCUMENT_DOWNLOAD_URL_TTL_SEC =
  Number(process.env.DOCUMENT_DOWNLOAD_URL_TTL_SEC || 900) || 900;

export type ProjectDocumentDto = {
  id: string;
  projectId: string;
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedBy: string | null;
  createdAt: string;
};

export type ProjectDocumentsListResult = {
  success: true;
  documents: ProjectDocumentDto[];
};

export type ProjectDocumentAccessResult = {
  success: true;
  document: ProjectDocumentDto;
  downloadUrl: string;
  expiresInSec: number;
};

export type ProjectDocumentsReadServiceDeps = {
  authz: AuthorizationService;
  repository: ProjectDocumentsRepository;
  storage: FileStoragePort;
  downloadUrlTtlSec?: number;
};

function serializeDocument(row: {
  id: string;
  projectId: string;
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedBy: string | null;
  createdAt: Date;
}): ProjectDocumentDto {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Authorized project document reads — metadata from Neon, download via signed URL. */
export class ProjectDocumentsReadService {
  constructor(private readonly deps: ProjectDocumentsReadServiceDeps) {}

  async listDocuments(user: AuthUser, projectId: string): Promise<ProjectDocumentsListResult> {
    const trimmed = projectId.trim();
    await this.deps.authz.assertProjectAccess(user, trimmed, 'projects.read');
    const rows = await this.deps.repository.listByProject(trimmed);
    return {
      success: true,
      documents: rows.map(serializeDocument),
    };
  }

  async getDocumentAccess(
    user: AuthUser,
    projectId: string,
    documentId: string,
  ): Promise<ProjectDocumentAccessResult> {
    const trimmedProjectId = projectId.trim();
    const trimmedDocumentId = documentId.trim();
    await this.deps.authz.assertProjectAccess(user, trimmedProjectId, 'projects.read');

    const row = await this.deps.repository.findById(trimmedProjectId, trimmedDocumentId);
    if (!row?.storageKey) {
      throw new AuthzNotFoundError({ error: 'Document not found' });
    }

    assertStorageKeyBelongsToProject(row.storageKey, trimmedProjectId);

    const ttlSec = this.deps.downloadUrlTtlSec ?? DEFAULT_DOCUMENT_DOWNLOAD_URL_TTL_SEC;
    let downloadUrl: string;
    try {
      downloadUrl = await this.deps.storage.getSignedDownloadUrl({
        key: row.storageKey,
        ttlSec,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Storage download failed';
      throw new ProjectDocumentsStorageError(message);
    }

    return {
      success: true,
      document: serializeDocument(row),
      downloadUrl,
      expiresInSec: ttlSec,
    };
  }
}

export function createProjectDocumentsReadService(
  deps: ProjectDocumentsReadServiceDeps,
): ProjectDocumentsReadService {
  return new ProjectDocumentsReadService(deps);
}
