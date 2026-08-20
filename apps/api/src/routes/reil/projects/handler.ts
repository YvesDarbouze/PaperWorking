import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import { canReadReilProject, canWriteReilProject } from '../../../lib/reil/access.js';

export type GetReilProjectFn = (id: string) => Promise<Record<string, unknown> | null>;
export type ListReilProjectsFn = (uid: string) => Promise<Array<Record<string, unknown>>>;
export type CreateReilProjectFn = (
  uid: string,
  body: Record<string, unknown>,
) => Promise<Record<string, unknown>>;
export type UpsertReilAppUserFn = (uid: string, email: string, name: string | null) => Promise<void>;

export interface ReilProjectsGetDeps {
  requireAuth?: RequireAuthFn;
  listProjects?: ListReilProjectsFn;
}

export interface ReilProjectsPostDeps {
  requireAuth?: RequireAuthFn;
  upsertAppUser?: UpsertReilAppUserFn;
  createProject?: CreateReilProjectFn;
}

/**
 * GET /api/reil/projects
 */
export async function handleReilProjectsGet(
  deps: ReilProjectsGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const projects = deps.listProjects ? await deps.listProjects(auth.uid) : [];
    return jsonResponse(200, projects);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[REIL Projects GET]', message);
    return jsonResponse(500, { error: 'Failed to list projects' });
  }
}

/**
 * POST /api/reil/projects
 */
export async function handleReilProjectsPost(
  body: Record<string, unknown>,
  deps: ReilProjectsPostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    if (deps.upsertAppUser) {
      await deps.upsertAppUser(auth.uid, auth.email ?? `${auth.uid}@unknown`, null);
    }
    const project = deps.createProject
      ? await deps.createProject(auth.uid, body)
      : { id: 'new-project', ...body, createdById: auth.uid };
    return jsonResponse(201, project);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[REIL Projects POST]', message);
    return jsonResponse(500, { error: 'Failed to create project' });
  }
}

export interface ReilProjectByIdGetDeps {
  requireAuth?: RequireAuthFn;
  getProject?: GetReilProjectFn;
}

export interface ReilProjectByIdPatchDeps {
  requireAuth?: RequireAuthFn;
  getProject?: GetReilProjectFn;
  updateProject?: (id: string, body: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

/**
 * GET /api/reil/projects/[id]
 */
export async function handleReilProjectByIdGet(
  projectId: string,
  deps: ReilProjectByIdGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const project = deps.getProject ? await deps.getProject(projectId) : null;
  if (!project) return jsonResponse(404, { error: 'Not found' });
  if (!canReadReilProject(project as { createdById: string; collaborators?: Array<{ userId: string }> }, auth.uid)) {
    return jsonResponse(403, { error: 'Forbidden' });
  }
  return jsonResponse(200, project);
}

/**
 * PATCH /api/reil/projects/[id]
 */
export async function handleReilProjectByIdPatch(
  projectId: string,
  body: Record<string, unknown>,
  deps: ReilProjectByIdPatchDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const project = deps.getProject ? await deps.getProject(projectId) : null;
  if (!project) return jsonResponse(404, { error: 'Not found' });
  if (!canWriteReilProject(project as { createdById: string }, auth.uid)) {
    return jsonResponse(403, { error: 'Forbidden' });
  }

  try {
    const updated = deps.updateProject
      ? await deps.updateProject(projectId, body)
      : { ...project, ...body };
    return jsonResponse(200, updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[REIL Project PATCH]', message);
    return jsonResponse(500, { error: 'Failed to update project' });
  }
}
