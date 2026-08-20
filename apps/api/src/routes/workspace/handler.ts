import { jsonResponse, type RouteResult } from '../../http/response.js';
import type { RequireAuthFn } from '../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../lib/auth/auth-types.js';
import {
  buildWorkspaceUpdatePatch,
  computeDeletionScheduleDate,
  parseWorkspaceAction,
  validateWorkspaceDeleteConfirmation,
  validateWorkspaceLogoUpload,
} from '../../lib/workspace/validation.js';

export type GetWorkspaceFn = (uid: string) => Promise<Record<string, unknown>>;
export type UpdateWorkspaceFn = (
  uid: string,
  patch: Record<string, unknown>,
) => Promise<Record<string, unknown>>;
export type UploadWorkspaceLogoFn = (uid: string, logoBase64: string) => Promise<string>;
export type ScheduleWorkspaceDeletionFn = (
  uid: string,
  deletionDate: string,
) => Promise<void>;
export type CancelWorkspaceDeletionFn = (uid: string) => Promise<void>;
export type GetWorkspaceOrgNameFn = (uid: string) => Promise<string>;

export interface WorkspaceGetDeps {
  requireAuth?: RequireAuthFn;
  getWorkspace?: GetWorkspaceFn;
}

export interface WorkspacePutDeps {
  requireAuth?: RequireAuthFn;
  updateWorkspace?: UpdateWorkspaceFn;
}

export interface WorkspacePostDeps {
  requireAuth?: RequireAuthFn;
  uploadLogo?: UploadWorkspaceLogoFn;
  scheduleDeletion?: ScheduleWorkspaceDeletionFn;
  cancelDeletion?: CancelWorkspaceDeletionFn;
  getOrgName?: GetWorkspaceOrgNameFn;
}

/**
 * GET /api/workspace
 */
export async function handleWorkspaceGet(deps: WorkspaceGetDeps = {}): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const workspace = deps.getWorkspace ? await deps.getWorkspace(auth.uid) : {};
  return jsonResponse(200, workspace);
}

/**
 * PUT /api/workspace — update name/timezone/logo fields.
 */
export async function handleWorkspacePut(
  body: Record<string, unknown>,
  deps: WorkspacePutDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const patch = buildWorkspaceUpdatePatch(body);
  const workspace = deps.updateWorkspace
    ? await deps.updateWorkspace(auth.uid, patch)
    : patch;

  return jsonResponse(200, { success: true, workspace });
}

/**
 * POST /api/workspace/[action] — logo upload, delete, cancel-deletion.
 */
export async function handleWorkspacePost(
  action: string | undefined,
  body: Record<string, unknown>,
  deps: WorkspacePostDeps = {},
): Promise<RouteResult> {
  const parsedAction = parseWorkspaceAction(action);
  if (!parsedAction) {
    return jsonResponse(404, { error: 'Endpoint not found' });
  }

  if (!deps.requireAuth) {
    return jsonResponse(500, { error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  if (parsedAction === 'logo') {
    const validated = validateWorkspaceLogoUpload(body);
    if (!validated.ok) {
      return jsonResponse(400, { error: validated.error });
    }

    const logoBase64 = body.logoBase64 as string;
    if (deps.uploadLogo) {
      await deps.uploadLogo(auth.uid, logoBase64);
    }

    return jsonResponse(200, { success: true, logo: logoBase64 });
  }

  if (parsedAction === 'delete') {
    const orgName = deps.getOrgName ? await deps.getOrgName(auth.uid) : '';
    const confirmed = validateWorkspaceDeleteConfirmation(body.confirmName, orgName);
    if (!confirmed.ok) {
      return jsonResponse(400, { error: confirmed.error });
    }

    const deletionDate = computeDeletionScheduleDate();
    if (deps.scheduleDeletion) {
      await deps.scheduleDeletion(auth.uid, deletionDate);
    }

    return jsonResponse(200, { success: true, deletionDate });
  }

  if (deps.cancelDeletion) {
    await deps.cancelDeletion(auth.uid);
  }

  return jsonResponse(200, { success: true });
}
