import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import { filterProjectsByQuery } from '../../../lib/projects/list.js';

export type LoadUserOrganizationFn = (
  uid: string,
) => Promise<{ organizationId?: string | null } | null>;

export type ListOrganizationProjectsFn = (
  organizationId: string,
) => Promise<Array<Record<string, unknown>>>;

export interface ProjectsListGetDeps {
  requireAuth?: RequireAuthFn;
  loadUserOrganization?: LoadUserOrganizationFn;
  listProjects?: ListOrganizationProjectsFn;
}

export interface ProjectsListGetQuery {
  q?: string;
}

/**
 * GET /api/projects — list projects for authenticated user's organization.
 */
export async function handleProjectsListGet(
  query: ProjectsListGetQuery = {},
  deps: ProjectsListGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  try {
    const user = deps.loadUserOrganization
      ? await deps.loadUserOrganization(auth.uid)
      : { organizationId: 'org-1' };

    if (!user) {
      return jsonResponse(404, { error: 'User profile not found' });
    }

    const organizationId = user.organizationId;
    if (!organizationId) {
      return jsonResponse(200, { success: true, projects: [] });
    }

    const allProjects = deps.listProjects
      ? await deps.listProjects(organizationId)
      : [];

    const projects = filterProjectsByQuery(
      allProjects as Array<{ propertyName?: string; address?: string }>,
      query.q || '',
    );

    return jsonResponse(200, { success: true, projects });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Projects GET] Error:', message);
    return jsonResponse(500, { error: 'Failed to fetch projects', details: message });
  }
}
