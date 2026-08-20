import { jsonResponse, type RouteResult } from '../../http/response.js';
import type { RequireAuthFn } from '../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../lib/auth/auth-types.js';
import { DEFAULT_ACCOUNT_QUOTA_BYTES, validateUploadQuota } from '../../lib/storage/quota.js';
import {
  buildUploadStoragePath,
  validateUploadInput,
  type UploadInput,
} from '../../lib/upload/validation.js';

export type GetProjectUsedBytesFn = (projectId: string) => Promise<number>;

export interface UploadPostDeps {
  requireAuth?: RequireAuthFn;
  getProjectUsedBytes?: GetProjectUsedBytesFn;
  generateFileId?: () => string;
  now?: () => Date;
}

/**
 * POST /api/upload — validate file metadata, quota, and return storage path.
 */
export async function handleUploadPost(
  body: UploadInput,
  deps: UploadPostDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { error: 'Auth not configured' });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    const validated = validateUploadInput(body);
    if (!validated.ok) {
      return jsonResponse(400, { error: validated.error });
    }

    const { fileName, fileSizeBytes, category } = validated.value;
    const projectId = body.projectId || 'proj_demo_1';

    const currentProjectUsedBytes = deps.getProjectUsedBytes
      ? await deps.getProjectUsedBytes(projectId)
      : 10485760;
    const projectQuotaBytes = Math.floor(DEFAULT_ACCOUNT_QUOTA_BYTES / 3);
    const quotaCheck = validateUploadQuota(currentProjectUsedBytes, projectQuotaBytes, fileSizeBytes);

    if (!quotaCheck.allowed) {
      return jsonResponse(400, { error: quotaCheck.errorReason });
    }

    const storagePath = buildUploadStoragePath(auth.uid, projectId, category, fileName);
    const file_id = deps.generateFileId?.() ?? `file_${Date.now()}`;
    const uploaded_at = (deps.now?.() ?? new Date()).toISOString();

    return jsonResponse(
      201,
      {
        success: true,
        file_id,
        fileName,
        url: `https://storage.paperworking.co${storagePath}`,
        storagePath,
        size: fileSizeBytes,
        category,
        uploaded_at,
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse(500, { error: 'Upload failed', details: message });
  }
}
