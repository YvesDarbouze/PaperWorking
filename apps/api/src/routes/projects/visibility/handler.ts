import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import { validateVisibilityPatch } from '../../../lib/projects/visibility.js';

export type UpdateProjectVisibilityFn = (input: {
  projectId: string;
  uid: string;
  isPublic: boolean;
}) => Promise<
  | { ok: true; isPublicOnMarketplace: boolean }
  | { ok: false; status: number; error: string }
>;

export interface ProjectVisibilityPatchDeps {
  requireAuth?: RequireAuthFn;
  updateVisibility?: UpdateProjectVisibilityFn;
}

/**
 * PATCH /api/projects/[id]/visibility
 */
export async function handleProjectVisibilityPatch(
  projectId: string,
  body: { isPublic?: unknown },
  deps: ProjectVisibilityPatchDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  if (!projectId?.trim()) {
    return jsonResponse(400, { error: 'Project id required.' });
  }

  const validated = validateVisibilityPatch(body);
  if (!validated.ok) {
    return jsonResponse(400, { error: validated.error });
  }

  try {
    if (!deps.updateVisibility) {
      return jsonResponse(200, { isPublicOnMarketplace: validated.isPublic });
    }

    const result = await deps.updateVisibility({
      projectId,
      uid: auth.uid,
      isPublic: validated.isPublic,
    });

    if (!result.ok) {
      return jsonResponse(result.status, { error: result.error });
    }

    return jsonResponse(200, { isPublicOnMarketplace: result.isPublicOnMarketplace });
  } catch (error: unknown) {
    console.error('[api/projects/[id]/visibility] failed', error);
    return jsonResponse(500, { error: 'Could not update visibility.' });
  }
}
