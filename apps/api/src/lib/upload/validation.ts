import type { DocumentCategory } from '../storage/categories.js';
import { getCategoryByFilename } from '../storage/categories.js';

export const ALLOWED_UPLOAD_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
] as const;

export interface UploadInput {
  fileName: string;
  fileSizeBytes: number;
  projectId?: string;
  category?: DocumentCategory;
}

export function extractFileExtension(fileName: string): string {
  const extMatch = fileName.match(/\.[0-9a-z]+$/i);
  return extMatch ? extMatch[0].toLowerCase() : '';
}

export function validateUploadInput(input: UploadInput): { ok: true; value: UploadInput & { ext: string; category: DocumentCategory } } | { ok: false; error: string } {
  if (!input.fileName?.trim()) {
    return { ok: false, error: 'No file uploaded' };
  }

  const ext = extractFileExtension(input.fileName);
  if (!ALLOWED_UPLOAD_EXTENSIONS.includes(ext as (typeof ALLOWED_UPLOAD_EXTENSIONS)[number])) {
    return {
      ok: false,
      error: `File type ${ext || '(none)'} is not allowed. Permitted: ${ALLOWED_UPLOAD_EXTENSIONS.join(', ')}`,
    };
  }

  if (!Number.isFinite(input.fileSizeBytes) || input.fileSizeBytes < 0) {
    return { ok: false, error: 'Invalid file size' };
  }

  const category = input.category ?? getCategoryByFilename(input.fileName);

  return {
    ok: true,
    value: {
      ...input,
      ext,
      category,
    },
  };
}

export function buildUploadStoragePath(
  uid: string,
  projectId: string,
  category: DocumentCategory,
  fileName: string,
): string {
  return `/${uid}/${projectId}/${category}/${fileName}`;
}
