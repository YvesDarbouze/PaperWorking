import { bffFetch } from '@/lib/api/bff-fetch';

export type ProjectDocumentRecord = {
  id: string;
  projectId: string;
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedBy: string | null;
  createdAt: string;
};

async function parseJsonResponse<T>(res: Response): Promise<T> {
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Request failed (${res.status})`);
  }

  if (!res.ok) {
    const err =
      data && typeof data === 'object' && 'error' in data
        ? String((data as Record<string, unknown>).error)
        : res.statusText || `HTTP ${res.status}`;
    if (res.status === 401) throw new Error('Unauthorized — sign in again.');
    if (res.status === 403) throw new Error(err || 'Forbidden — insufficient permissions.');
    throw new Error(err);
  }

  return data as T;
}

/** GET /api/projects/:id/documents via same-origin BFF (Phase B14). */
export async function listProjectDocumentsFromBff(projectId: string): Promise<{
  success: true;
  documents: ProjectDocumentRecord[];
}> {
  const res = await bffFetch(`/api/projects/${encodeURIComponent(projectId)}/documents`, {
    credentials: 'include',
    cache: 'no-store',
  });
  return parseJsonResponse(res);
}

/** POST /api/projects/:id/documents via same-origin BFF multipart upload (Phase B14). */
export async function uploadProjectDocumentFromBff(
  projectId: string,
  file: File,
): Promise<{
  success: true;
  document: ProjectDocumentRecord & { storageKey?: string };
}> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await bffFetch(`/api/projects/${encodeURIComponent(projectId)}/documents`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  return parseJsonResponse(res);
}

/** GET /api/projects/:id/documents/:documentId via same-origin BFF (Phase B14). */
export async function getProjectDocumentAccessFromBff(
  projectId: string,
  documentId: string,
): Promise<{
  success: true;
  document: ProjectDocumentRecord;
  downloadUrl: string;
  expiresInSec: number;
}> {
  const res = await bffFetch(
    `/api/projects/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(documentId)}`,
    {
      credentials: 'include',
      cache: 'no-store',
    },
  );
  return parseJsonResponse(res);
}
