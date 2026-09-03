import { optionalDate, optionalNumber, optionalString } from './timestamp.js';

export type ProjectFileReadModel = {
  id: string;
  projectId: string;
  organizationId: string;
  folderId: string;
  name: string;
  category: string;
  storagePath: string;
  storageUrl: string;
  fileType: string;
  sizeBytes: number | null;
  uploadedByUid: string;
  isVerified: boolean;
  metadata: Record<string, unknown>;
  uploadedAt: Date;
  updatedAt: Date;
};

export function projectFileFromFirestore(
  documentId: string,
  data: Record<string, unknown>,
): ProjectFileReadModel {
  const storagePath =
    optionalString(data.storagePath) ??
    optionalString(data.storageKey) ??
    optionalString(data.storageUrl) ??
    '';

  return {
    id: optionalString(data.id) ?? documentId,
    projectId: optionalString(data.projectId) ?? '',
    organizationId: optionalString(data.organizationId) ?? '',
    folderId: optionalString(data.folderId) ?? 'uncategorized',
    name: optionalString(data.name) ?? 'document',
    category: optionalString(data.category) ?? 'General',
    storagePath,
    storageUrl: optionalString(data.storageUrl) ?? storagePath,
    fileType:
      optionalString(data.fileType) ??
      optionalString(data.mimeType) ??
      'application/octet-stream',
    sizeBytes: optionalNumber(data.sizeBytes),
    uploadedByUid:
      optionalString(data.uploadedByUid) ?? optionalString(data.uploadedBy) ?? '',
    isVerified: data.isVerified === true,
    metadata:
      data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)
        ? (data.metadata as Record<string, unknown>)
        : {},
    uploadedAt: optionalDate(data.uploadedAt) ?? optionalDate(data.createdAt) ?? new Date(0),
    updatedAt: optionalDate(data.updatedAt) ?? optionalDate(data.uploadedAt) ?? new Date(0),
  };
}

export function projectFileToDocumentRow(model: ProjectFileReadModel) {
  return {
    id: model.id,
    projectId: model.projectId,
    name: model.name,
    mimeType: model.fileType,
    storageKey: model.storagePath,
    sizeBytes: model.sizeBytes,
    uploadedBy: model.uploadedByUid,
    metadata: model.metadata,
    createdAt: model.uploadedAt,
    updatedAt: model.updatedAt,
  };
}
