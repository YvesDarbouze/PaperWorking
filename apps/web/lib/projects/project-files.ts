/**
 * File types accepted by a project's Docs & Files: documents, spreadsheets,
 * presentations, images, audio and video. Executables and archives are refused.
 */

export const MAX_PROJECT_FILE_BYTES = 50 * 1024 * 1024;

const ALLOWED_MIME_EXACT = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/rtf',
  'text/plain',
  'text/csv',
]);

const ALLOWED_MIME_PREFIXES = ['image/', 'audio/', 'video/'];

const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'rtf', 'txt',
  'xls', 'xlsx', 'csv',
  'ppt', 'pptx',
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'svg',
  'mp3', 'm4a', 'wav',
  'mp4', 'mov', 'webm',
]);

/** Comma-separated list for an `<input type="file" accept>` attribute. */
export const PROJECT_FILE_ACCEPT = [...ALLOWED_EXTENSIONS].map((ext) => `.${ext}`).join(',');

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase();
}

export function isAllowedProjectFile(fileName: string, mimeType: string | undefined): boolean {
  const mime = (mimeType || '').toLowerCase();
  if (mime && (ALLOWED_MIME_EXACT.has(mime) || ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p)))) {
    return true;
  }
  // Browsers often send an empty or generic type; fall back to the extension.
  return ALLOWED_EXTENSIONS.has(extensionOf(fileName));
}

export type ProjectFileKind = 'pdf' | 'document' | 'spreadsheet' | 'presentation' | 'image' | 'audio' | 'video' | 'other';

export function projectFileKind(fileName: string, mimeType?: string): ProjectFileKind {
  const mime = (mimeType || '').toLowerCase();
  const ext = extensionOf(fileName);
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'svg'].includes(ext)) return 'image';
  if (mime.startsWith('audio/') || ['mp3', 'm4a', 'wav'].includes(ext)) return 'audio';
  if (mime.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(ext)) return 'video';
  if (['xls', 'xlsx', 'csv'].includes(ext) || mime.includes('spreadsheet') || mime === 'text/csv') return 'spreadsheet';
  if (['ppt', 'pptx'].includes(ext) || mime.includes('presentation')) return 'presentation';
  if (['doc', 'docx', 'rtf', 'txt'].includes(ext) || mime.includes('word') || mime === 'text/plain') return 'document';
  return 'other';
}
