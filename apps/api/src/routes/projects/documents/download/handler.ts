import { binaryResponse, jsonResponse, type RouteResult } from '../../../../http/response.js';
import type { RequireAuthFn } from '../../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../../lib/auth/auth-types.js';
import {
  getFolderForDocument,
  getPhaseForDocument,
  VENDOR_SLOT_FOLDER_MAPPING,
} from '../../../../lib/projects/documents.js';

export type ResolveDocumentDownloadFn = (input: {
  projectId: string;
  docId: string;
  pathParam?: string | null;
  nameParam?: string | null;
  uid?: string | null;
  email?: string | null;
}) => Promise<{
  authorized: boolean;
  fileType: string;
  fileName: string;
  content: Uint8Array;
} | null>;

export interface ProjectsDocumentDownloadGetDeps {
  requireAuth?: RequireAuthFn;
  resolveDownload?: ResolveDocumentDownloadFn;
}

/**
 * GET /api/projects/[id]/documents/[docId]/download
 */
export async function handleProjectsDocumentDownloadGet(
  projectId: string,
  docId: string,
  query: { path?: string | null; name?: string | null },
  deps: ProjectsDocumentDownloadGetDeps = {},
): Promise<RouteResult> {
  if (!projectId || !docId) {
    return jsonResponse(400, { error: 'Missing projectId or docId' });
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

  if (docId === 'download' && query.path && !query.path.startsWith(`projects/${projectId}/`)) {
    return jsonResponse(403, { error: 'Access denied: path outside project directory' });
  }

  try {
    const resolved = deps.resolveDownload
      ? await deps.resolveDownload({
          projectId,
          docId,
          pathParam: query.path,
          nameParam: query.name,
          uid,
          email,
        })
      : {
          authorized: true,
          fileType: 'application/pdf',
          fileName: query.name || 'document.pdf',
          content: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
        };

    if (!resolved) {
      return jsonResponse(404, { error: 'Document not found' });
    }

    if (!resolved.authorized) {
      return jsonResponse(403, { error: 'Access denied' });
    }

    return binaryResponse(200, resolved.content, {
      'Content-Type': resolved.fileType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${resolved.fileName}"`,
      'Cache-Control': 'private, max-age=3600',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[API/documents download GET] failed:', message);
    return jsonResponse(500, { error: 'Failed to download document' });
  }
}

export { getFolderForDocument, getPhaseForDocument, VENDOR_SLOT_FOLDER_MAPPING };
