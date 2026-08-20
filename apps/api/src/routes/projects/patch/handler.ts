import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import { projectPatchBodySchema } from '../../../lib/projects/patch-schema.js';

export type PatchProjectFn = (input: {
  projectId: string;
  uid: string;
  body: Record<string, unknown>;
  financials?: Record<string, unknown>;
  topLevelUpdates: Record<string, unknown>;
}) => Promise<
  | { ok: true; project: Record<string, unknown> }
  | { ok: false; status: number; error: string }
>;

export interface ProjectPatchDeps {
  requireAuth?: RequireAuthFn;
  patchProject?: PatchProjectFn;
}

/**
 * PATCH /api/projects/[id] — partial project update with financials merge.
 */
export async function handleProjectPatch(
  projectId: string,
  body: unknown,
  deps: ProjectPatchDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { error: 'Auth not configured' });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    if (!projectId?.trim()) {
      return jsonResponse(400, { error: 'Missing project ID' });
    }

    const validation = projectPatchBodySchema.safeParse(body);
    if (!validation.success) {
      return jsonResponse(400, {
        error: 'Validation failed',
        details: validation.error.flatten().fieldErrors,
      });
    }

    const { financials, ...topLevelUpdates } = validation.data;

    if (!deps.patchProject) {
      return jsonResponse(500, { error: 'Project patch handler not configured' });
    }

    const result = await deps.patchProject({
      projectId,
      uid: auth.uid,
      body: validation.data as Record<string, unknown>,
      financials: financials as Record<string, unknown> | undefined,
      topLevelUpdates: topLevelUpdates as Record<string, unknown>,
    });

    if (!result.ok) {
      return jsonResponse(result.status, { error: result.error });
    }

    return jsonResponse(200, { success: true, project: result.project });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Projects PATCH] Error:', message);
    return jsonResponse(500, { error: 'Failed to update project', details: message });
  }
}
