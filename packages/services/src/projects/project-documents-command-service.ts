import { randomUUID } from 'node:crypto';
import type { AuthorizationService, AuthUser } from '@paperworking/authz';
import type { FileStoragePort } from '../storage/file-storage-port.js';
import {
  buildProjectDocumentStorageKey,
  validateProjectDocumentUpload,
} from './document-upload-validation.js';
import { ProjectDocumentsStorageError } from './project-documents-errors.js';
import type { ProjectDocumentsRepository } from './project-documents-repository.js';

export type UploadProjectDocumentInput = {
  fileName: string;
  mimeType?: string | null;
  sizeBytes: number;
  data: Buffer;
};

export type UploadProjectDocumentResult = {
  success: true;
  document: {
    id: string;
    projectId: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    uploadedBy: string;
    createdAt: string;
  };
};

export type ProjectDocumentsCommandServiceDeps = {
  authz: AuthorizationService;
  repository: ProjectDocumentsRepository;
  storage: FileStoragePort;
};

/** Upload project documents — Firebase bytes first, Neon metadata second with cleanup on failure. */
export class ProjectDocumentsCommandService {
  constructor(private readonly deps: ProjectDocumentsCommandServiceDeps) {}

  async uploadDocument(
    user: AuthUser,
    projectId: string,
    input: UploadProjectDocumentInput,
  ): Promise<UploadProjectDocumentResult> {
    const trimmedProjectId = projectId.trim();
    await this.deps.authz.assertProjectAccess(user, trimmedProjectId, 'projects.update');

    const validated = validateProjectDocumentUpload(input);
    const documentId = randomUUID();
    const storageKey = buildProjectDocumentStorageKey({
      projectId: trimmedProjectId,
      documentId,
      fileName: validated.fileName,
    });

    try {
      await this.deps.storage.putObject({
        key: storageKey,
        data: input.data,
        contentType: validated.mimeType,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Storage upload failed';
      throw new ProjectDocumentsStorageError(message);
    }

    try {
      const row = await this.deps.repository.create({
        id: documentId,
        projectId: trimmedProjectId,
        name: validated.fileName,
        mimeType: validated.mimeType,
        storageKey,
        sizeBytes: validated.sizeBytes,
        uploadedBy: user.uid,
        metadata: { source: 'project_documents_b14' },
      });

      return {
        success: true,
        document: {
          id: row.id,
          projectId: row.projectId,
          name: row.name,
          mimeType: validated.mimeType,
          sizeBytes: validated.sizeBytes,
          uploadedBy: user.uid,
          createdAt: row.createdAt.toISOString(),
        },
      };
    } catch (error) {
      await this.deps.storage.deleteObject({ key: storageKey }).catch(() => undefined);
      throw error;
    }
  }
}

export function createProjectDocumentsCommandService(
  deps: ProjectDocumentsCommandServiceDeps,
): ProjectDocumentsCommandService {
  return new ProjectDocumentsCommandService(deps);
}
