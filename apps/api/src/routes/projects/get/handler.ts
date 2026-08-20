import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../auth/sessions/handler.js';

export interface ProjectGetParams {
  projectId: string;
}

export interface ProjectDocument {
  id: string;
  project_id: string;
  [key: string]: unknown;
}

export type GetProjectByIdFn = (projectId: string) => Promise<ProjectDocument | null>;

export interface ProjectGetDeps {
  authenticate?: RequireAuthFn;
  getProject?: GetProjectByIdFn;
}

function isAuthFailure(
  result: { uid: string } | { status: number; body: unknown },
): result is { status: number; body: unknown } {
  return 'status' in result && 'body' in result && !('uid' in result);
}

/**
 * GET /api/projects/[id] — migrated from PaperWorking src/app/api/projects/[id]/route.ts
 * Read-only: returns Firestore project document shape `{ success, project }`.
 */
export async function handleProjectGet(
  params: ProjectGetParams,
  deps: ProjectGetDeps = {},
): Promise<RouteResult> {
  try {
    if (deps.authenticate) {
      const auth = await deps.authenticate();
      if (isAuthFailure(auth)) {
        return jsonResponse(auth.status, auth.body);
      }
    } else {
      return jsonResponse(401, { error: 'Unauthorized' });
    }

    const projectId = params.projectId?.trim();
    if (!projectId) {
      return jsonResponse(400, { error: 'Missing project ID' });
    }

    if (!deps.getProject) {
      return jsonResponse(503, { error: 'Project reader not configured' });
    }

    const project = await deps.getProject(projectId);
    if (!project) {
      return jsonResponse(404, { error: 'Project not found' });
    }

    return jsonResponse(200, { success: true, project });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Projects GET] Error:', errMsg);
    return jsonResponse(500, { error: 'Failed to fetch project', details: errMsg });
  }
}
