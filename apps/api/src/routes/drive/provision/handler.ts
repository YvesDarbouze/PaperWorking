import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  buildDriveFoldersPayload,
  DRIVE_SUB_FOLDERS,
  validateDriveProvisionBody,
} from '../../../lib/drive/provision.js';

export type VerifyIdTokenFn = (idToken: string) => Promise<{ uid: string }>;
export type LoadDriveProvisionContextFn = (
  projectId: string,
  uid: string,
) => Promise<{ dealOrgId?: string; userOrgId?: string; exists: boolean } | null>;
export type CreateDriveFoldersFn = (
  propertyAddress: string,
) => Promise<{
  parentFolder: { id: string; webViewLink: string };
  subFolders: Record<string, { id: string; webViewLink: string }>;
}>;
export type SaveDriveFoldersFn = (projectId: string, driveFolders: Record<string, unknown>) => Promise<void>;

/**
 * POST /api/drive/provision
 */
export async function handleDriveProvisionPost(
  body: Record<string, unknown>,
  deps: {
    verifyIdToken?: VerifyIdTokenFn;
    loadContext?: LoadDriveProvisionContextFn;
    createFolders?: CreateDriveFoldersFn;
    saveFolders?: SaveDriveFoldersFn;
  } = {},
): Promise<RouteResult> {
  try {
    const validated = validateDriveProvisionBody(body);
    if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

    if (!deps.verifyIdToken) return jsonResponse(500, { error: 'Auth not configured' });
    const decoded = await deps.verifyIdToken(String(body.idToken));
    const context = deps.loadContext
      ? await deps.loadContext(validated.projectId, decoded.uid)
      : { exists: true, dealOrgId: 'org', userOrgId: 'org' };
    if (!context?.exists) return jsonResponse(404, { error: 'Deal not found.' });
    if (context.dealOrgId !== context.userOrgId) {
      return jsonResponse(403, { error: 'Cross-tenant access denied.' });
    }

    const subFolderResults: Record<string, { id: string; webViewLink: string }> = {};
    const created = deps.createFolders
      ? await deps.createFolders(validated.propertyAddress)
      : {
          parentFolder: { id: 'parent', webViewLink: 'https://drive.google.com/parent' },
          subFolders: Object.fromEntries(
            DRIVE_SUB_FOLDERS.map((name) => [name, { id: name, webViewLink: `https://drive.google.com/${name}` }]),
          ),
        };

    for (const name of DRIVE_SUB_FOLDERS) {
      subFolderResults[name] = created.subFolders[name];
    }

    const driveFolders = buildDriveFoldersPayload({
      parentFolder: created.parentFolder,
      subFolders: subFolderResults,
    });
    if (deps.saveFolders) await deps.saveFolders(validated.projectId, driveFolders);

    return jsonResponse(200, { success: true, projectId: validated.projectId, driveFolders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if ((err as { code?: string }).code === 'auth/id-token-expired') {
      return jsonResponse(401, { error: 'Session expired. Please re-authenticate.' });
    }
    console.error('[Drive Provision]', message);
    return jsonResponse(500, { error: 'Failed to provision Drive folders.', details: message });
  }
}
