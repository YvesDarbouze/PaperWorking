import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  buildDocumentDownloadPath,
  getFolderForDocument,
  getPhaseForDocument,
  sanitizeDocumentFilename,
  validateDocumentUpload,
  VENDOR_SLOT_FOLDER_MAPPING,
} from '../../../lib/projects/documents.js';

export type VerifyProjectDocumentAccessFn = (
  projectId: string,
  uid: string,
  email?: string | null,
) => Promise<{
  authorized: boolean;
  role: string;
  project: Record<string, unknown>;
  partyId?: string;
  phasePermissions?: Record<string, { canView?: boolean; canEdit?: boolean }>;
} | null>;

export type ListProjectDocumentsFn = (
  projectId: string,
  context: {
    role: string;
    uid?: string | null;
    email?: string | null;
    visibilityMode?: string;
    exposedDocumentIds?: string[];
    partyId?: string;
    phasePermissions?: Record<string, { canView?: boolean; canEdit?: boolean }>;
  },
) => Promise<Array<Record<string, unknown>>>;

export type UploadProjectDocumentFn = (input: {
  projectId: string;
  uid: string;
  email?: string | null;
  file: { name: string; mimeType: string; sizeBytes: number; buffer: Uint8Array };
  documentType: string;
  category: string;
  phase: string;
  folderName: string;
}) => Promise<{ docId: string; downloadUrl: string; storagePath: string; phase: string }>;

export interface ProjectsDocumentsGetDeps {
  requireAuth?: RequireAuthFn;
  verifyAccess?: VerifyProjectDocumentAccessFn;
  listDocuments?: ListProjectDocumentsFn;
  resolveVisibility?: (projectId: string) => Promise<{ visibilityMode: string; exposedDocumentIds: string[] }>;
}

export interface ProjectsDocumentsPostDeps {
  requireAuth?: RequireAuthFn;
  verifyAccess?: VerifyProjectDocumentAccessFn;
  uploadDocument?: UploadProjectDocumentFn;
}

/**
 * GET /api/projects/[id]/documents
 */
export async function handleProjectsDocumentsGet(
  projectId: string,
  deps: ProjectsDocumentsGetDeps = {},
): Promise<RouteResult> {
  if (!projectId) {
    return jsonResponse(400, { error: 'Missing project ID' });
  }

  let uid: string | null = null;
  let email: string | null = null;
  if (deps.requireAuth) {
    const auth = await deps.requireAuth();
    if (!isAuthFailure(auth)) {
      uid = auth.uid;
      email = auth.email ?? null;
    }
  }

  try {
    const access = uid && deps.verifyAccess
      ? await deps.verifyAccess(projectId, uid, email)
      : null;

    const visibility = deps.resolveVisibility
      ? await deps.resolveVisibility(projectId)
      : { visibilityMode: 'PRIVATE', exposedDocumentIds: [] as string[] };

    let authorized = !!access?.authorized;
    let role = access?.role || 'Anonymous';

    if (!authorized && ['PUBLIC_SOLICITED', 'MARKETPLACE'].includes(visibility.visibilityMode) && uid) {
      authorized = true;
      role = 'Subscriber';
    }

    if (!authorized) {
      return jsonResponse(403, { error: 'Access denied' });
    }

    const documents = deps.listDocuments
      ? await deps.listDocuments(projectId, {
          role,
          uid,
          email,
          visibilityMode: visibility.visibilityMode,
          exposedDocumentIds: visibility.exposedDocumentIds,
          partyId: access?.partyId,
          phasePermissions: access?.phasePermissions,
        })
      : [];

    return jsonResponse(200, { documents });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[API/documents GET] failed:', message);
    return jsonResponse(500, { error: 'Failed to fetch documents' });
  }
}

/**
 * POST /api/projects/[id]/documents
 */
export async function handleProjectsDocumentsPost(
  projectId: string,
  input: {
    file?: { name: string; mimeType: string; sizeBytes: number; buffer: Uint8Array } | null;
    documentType?: string;
    category?: string;
    phase?: string;
  },
  deps: ProjectsDocumentsPostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  if (!projectId) {
    return jsonResponse(400, { error: 'Missing project ID' });
  }

  const file = input.file;
  if (!file) {
    return jsonResponse(400, { error: 'No file provided. Include a "file" field.' });
  }

  const documentType = input.documentType || 'other';
  const validated = validateDocumentUpload({
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    documentType,
  });
  if (!validated.ok) {
    return jsonResponse(validated.status, { error: validated.error });
  }

  const access = deps.verifyAccess
    ? await deps.verifyAccess(projectId, auth.uid, auth.email)
    : { authorized: true, role: 'Lead Investor', project: {} };

  if (!access?.authorized) {
    return jsonResponse(403, { error: 'Project not found or access denied' });
  }

  if (access.role !== 'Lead Investor') {
    const canEdit = access.phasePermissions?.['phase-2']?.canEdit ?? true;
    if (!canEdit) {
      return jsonResponse(403, { error: 'Edit permission denied for this phase' });
    }
  }

  const category = input.category || 'Other';
  const phase =
    input.phase ||
    getPhaseForDocument({
      name: file.name,
      fileName: file.name,
      category,
      documentType,
    });

  const resolvedFolder = getFolderForDocument({
    name: file.name,
    fileName: file.name,
    category,
    documentType,
  });

  if (access.role === 'Vendor') {
    const assignedFolder = VENDOR_SLOT_FOLDER_MAPPING[access.partyId || ''];
    if (!assignedFolder || resolvedFolder !== assignedFolder) {
      return jsonResponse(403, {
        error: `Vendor is only authorized to upload documents to the "${assignedFolder}" folder`,
      });
    }
  }

  try {
    const uploaded = deps.uploadDocument
      ? await deps.uploadDocument({
          projectId,
          uid: auth.uid,
          email: auth.email,
          file: {
            ...file,
            name: sanitizeDocumentFilename(file.name),
          },
          documentType,
          category,
          phase,
          folderName: resolvedFolder,
        })
      : {
          docId: crypto.randomUUID(),
          downloadUrl: buildDocumentDownloadPath(projectId, 'doc-demo'),
          storagePath: `projects/${projectId}/documents/doc-demo/${file.name}`,
          phase,
        };

    return jsonResponse(201, {
      docId: uploaded.docId,
      downloadUrl: uploaded.downloadUrl,
      storagePath: uploaded.storagePath,
      status: 'Uploaded',
      phase: uploaded.phase,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[API/documents] Upload failed:', message);
    return jsonResponse(500, { error: 'Document upload failed', details: message });
  }
}
