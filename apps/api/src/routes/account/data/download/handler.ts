import { binaryResponse, jsonResponse, type RouteResult } from '../../../../http/response.js';
import type { RequireAuthFn } from '../../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../../lib/auth/auth-types.js';

export type BuildGdprExportZipFn = (uid: string) => Promise<Uint8Array>;

export interface AccountDataDownloadPostDeps {
  requireAuth?: RequireAuthFn;
  buildExportZip?: BuildGdprExportZipFn;
}

/**
 * POST /api/account/data/download
 */
export async function handleAccountDataDownloadPost(
  deps: AccountDataDownloadPostDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { error: 'Auth not configured' });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    const zipBuffer = deps.buildExportZip
      ? await deps.buildExportZip(auth.uid)
      : new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

    return binaryResponse(200, zipBuffer, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename=PaperWorking_GDPR_Export_${auth.uid}.zip`,
      'Cache-Control': 'no-store, max-age=0',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GDPR download] Error compiling ZIP:', message);
    return jsonResponse(500, { error: 'Failed to compile data export bundle', details: message });
  }
}
