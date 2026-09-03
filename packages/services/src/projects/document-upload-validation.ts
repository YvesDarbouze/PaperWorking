import { ProjectDocumentsValidationError } from './project-documents-errors.js';

/** Reuse legacy vault limits — PDF/images only, 25 MB max. */
export const ALLOWED_PROJECT_DOCUMENT_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export const MAX_PROJECT_DOCUMENT_BYTES =
  Number(process.env.PROJECT_DOCUMENT_MAX_BYTES || 25 * 1024 * 1024) || 25 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

export function sanitizeProjectDocumentFileName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop()?.trim() || 'document';
  const cleaned = base.replace(/[^\w.\-()+ ]+/g, '_').replace(/_+/g, '_');
  return cleaned.length > 0 ? cleaned.slice(0, 200) : 'document';
}

export function inferMimeType(fileName: string, declaredMime?: string | null): string {
  const ext = fileName.match(/\.[0-9a-z]+$/i)?.[0]?.toLowerCase() ?? '';
  const inferred = MIME_BY_EXT[ext];
  const mime = (declaredMime || inferred || '').trim().toLowerCase();
  if (
    !ALLOWED_PROJECT_DOCUMENT_MIMES.includes(
      mime as (typeof ALLOWED_PROJECT_DOCUMENT_MIMES)[number],
    )
  ) {
    throw new ProjectDocumentsValidationError(
      `File type not allowed. Permitted: ${ALLOWED_PROJECT_DOCUMENT_MIMES.join(', ')}`,
    );
  }
  if (inferred && declaredMime && inferred !== declaredMime.toLowerCase()) {
    throw new ProjectDocumentsValidationError('File extension does not match MIME type');
  }
  return mime;
}

export function validateProjectDocumentUpload(input: {
  fileName: string;
  mimeType?: string | null;
  sizeBytes: number;
}): { fileName: string; mimeType: string; sizeBytes: number } {
  const fileName = sanitizeProjectDocumentFileName(input.fileName);
  if (!fileName.includes('.')) {
    throw new ProjectDocumentsValidationError('File name must include an extension');
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new ProjectDocumentsValidationError('Empty files are not allowed');
  }
  if (input.sizeBytes > MAX_PROJECT_DOCUMENT_BYTES) {
    throw new ProjectDocumentsValidationError(
      `File exceeds maximum size of ${MAX_PROJECT_DOCUMENT_BYTES} bytes`,
    );
  }
  const mimeType = inferMimeType(fileName, input.mimeType);
  return { fileName, mimeType, sizeBytes: input.sizeBytes };
}

export function buildProjectDocumentStorageKey(input: {
  projectId: string;
  documentId: string;
  fileName: string;
}): string {
  const safeName = sanitizeProjectDocumentFileName(input.fileName);
  return `projects/${input.projectId}/documents/${input.documentId}/${safeName}`;
}

export function assertStorageKeyBelongsToProject(storageKey: string, projectId: string): void {
  const normalized = storageKey.replace(/^\/+/, '');
  const expectedPrefix = `projects/${projectId}/`;
  if (!normalized.startsWith(expectedPrefix) || normalized.includes('..')) {
    throw new ProjectDocumentsValidationError('Invalid storage key for project document');
  }
}
