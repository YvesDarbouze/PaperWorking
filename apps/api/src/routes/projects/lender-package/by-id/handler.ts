import { jsonResponse, type RouteResult } from '../../../../http/response.js';
import type { RequireAuthFn } from '../../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../../lib/auth/auth-types.js';
import { buildLenderPackageItemPatch } from '../../../../lib/projects/lender-package-item.js';

export type VerifyProjectMembershipFn = (
  projectId: string,
  uid: string,
) => Promise<Record<string, unknown> | null>;

export type LoadLenderPackageItemFn = (
  projectId: string,
  itemId: string,
) => Promise<Record<string, unknown> | null>;

export type UpdateLenderPackageItemFn = (
  projectId: string,
  itemId: string,
  update: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

export type DeleteLenderPackageItemFn = (projectId: string, itemId: string) => Promise<boolean>;

export interface ProjectsLenderPackageItemPatchDeps {
  requireAuth?: RequireAuthFn;
  verifyMembership?: VerifyProjectMembershipFn;
  loadItem?: LoadLenderPackageItemFn;
  updateItem?: UpdateLenderPackageItemFn;
}

export interface ProjectsLenderPackageItemDeleteDeps {
  requireAuth?: RequireAuthFn;
  verifyMembership?: VerifyProjectMembershipFn;
  loadItem?: LoadLenderPackageItemFn;
  deleteItem?: DeleteLenderPackageItemFn;
}

/**
 * PATCH /api/projects/[id]/lender-package/[itemId]
 */
export async function handleProjectsLenderPackageItemPatch(
  projectId: string,
  itemId: string,
  body: Record<string, unknown>,
  deps: ProjectsLenderPackageItemPatchDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const project = deps.verifyMembership
      ? await deps.verifyMembership(projectId, auth.uid)
      : {};
    if (!project) {
      return jsonResponse(403, { error: 'Project not found or access denied' });
    }

    const item = deps.loadItem ? await deps.loadItem(projectId, itemId) : { id: itemId };
    if (!item) return jsonResponse(404, { error: 'Checklist item not found' });

    const patch = buildLenderPackageItemPatch(body);
    if (!patch.ok) return jsonResponse(patch.status, { error: patch.error });

    const updated = deps.updateItem
      ? await deps.updateItem(projectId, itemId, patch.update)
      : { id: itemId, ...patch.update };
    return jsonResponse(200, { item: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Lender Package Item PATCH]', message);
    return jsonResponse(500, { error: 'Failed to update checklist item' });
  }
}

/**
 * DELETE /api/projects/[id]/lender-package/[itemId]
 */
export async function handleProjectsLenderPackageItemDelete(
  projectId: string,
  itemId: string,
  deps: ProjectsLenderPackageItemDeleteDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const project = deps.verifyMembership
      ? await deps.verifyMembership(projectId, auth.uid)
      : {};
    if (!project) {
      return jsonResponse(403, { error: 'Project not found or access denied' });
    }

    const item = deps.loadItem ? await deps.loadItem(projectId, itemId) : { id: itemId };
    if (!item) return jsonResponse(404, { error: 'Checklist item not found' });

    if (deps.deleteItem) await deps.deleteItem(projectId, itemId);
    return jsonResponse(200, { success: true, message: 'Checklist item deleted.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Lender Package Item DELETE]', message);
    return jsonResponse(500, { error: 'Failed to delete checklist item' });
  }
}

export type FindDebtFolderFn = (projectId: string) => Promise<string | null>;
export type CreateDebtFolderFn = (input: {
  projectId: string;
  organizationId: string;
  ownerUid: string;
}) => Promise<string>;

export interface ProjectsLenderPackageDebtFolderPostDeps {
  requireAuth?: RequireAuthFn;
  verifyMembership?: VerifyProjectMembershipFn;
  findDebtFolder?: FindDebtFolderFn;
  createDebtFolder?: CreateDebtFolderFn;
}

/**
 * POST /api/projects/[id]/lender-package/debt-folder
 */
export async function handleProjectsLenderPackageDebtFolderPost(
  projectId: string,
  deps: ProjectsLenderPackageDebtFolderPostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const project = deps.verifyMembership
      ? await deps.verifyMembership(projectId, auth.uid)
      : { organizationId: '', ownerUid: auth.uid };
    if (!project) {
      return jsonResponse(403, { error: 'Project not found or access denied' });
    }

    const existing = deps.findDebtFolder ? await deps.findDebtFolder(projectId) : null;
    if (existing) return jsonResponse(200, { folderId: existing });

    const folderId = deps.createDebtFolder
      ? await deps.createDebtFolder({
          projectId,
          organizationId: String(project.organizationId || ''),
          ownerUid: String(project.ownerUid || auth.uid),
        })
      : crypto.randomUUID();
    return jsonResponse(201, { folderId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Debt Folder POST]', message);
    return jsonResponse(500, { error: 'Failed to ensure Debt folder' });
  }
}
