import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  calculateStorageQuotaBytes,
  isVendorAccount,
  phaseToCurrentPhase,
  projectCreateSchema,
  type ProjectCreateInput,
} from '../../../lib/projects/create-schema.js';

export type GetUserForProjectCreateFn = (uid: string) => Promise<{
  organizationId?: string;
  personalOrganizationId?: string;
  account_type?: string;
  accountType?: string;
  role?: string;
  displayName?: string;
  email?: string;
} | null>;

export type CountOrgProjectsFn = (organizationId: string) => Promise<number>;

export type CreateProjectFn = (input: {
  uid: string;
  payload: ProjectCreateInput;
  organizationId: string;
  storageQuotaBytes: number;
  userData: Record<string, unknown> | null;
}) => Promise<{ projectId: string; project: Record<string, unknown> }>;

export type AfterProjectCreatedFn = (input: {
  uid: string;
  organizationId: string;
  projectId: string;
  propertyAddress: string;
  actorName: string;
}) => Promise<void>;

export interface ProjectsCreatePostDeps {
  requireAuth?: RequireAuthFn;
  getUser?: GetUserForProjectCreateFn;
  countOrgProjects?: CountOrgProjectsFn;
  createProject?: CreateProjectFn;
  afterCreated?: AfterProjectCreatedFn;
}

/**
 * POST /api/projects/create — authenticated project creation from wizard payload.
 */
export async function handleProjectsCreatePost(
  body: unknown,
  deps: ProjectsCreatePostDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { error: 'Auth not configured' });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    const validation = projectCreateSchema.safeParse(body);
    if (!validation.success) {
      return jsonResponse(400, {
        error: 'Validation failed',
        details: validation.error.flatten().fieldErrors,
      });
    }

    const payload = validation.data;
    const userData = deps.getUser ? await deps.getUser(auth.uid) : null;

    if (isVendorAccount(userData)) {
      return jsonResponse(403, { error: 'Vendors are restricted from creating projects.' });
    }

    let organizationId = payload.organizationId;
    if (!organizationId) {
      organizationId =
        userData?.organizationId || userData?.personalOrganizationId || auth.uid;
    }

    let existingProjectCount = 0;
    if (deps.countOrgProjects && organizationId) {
      try {
        existingProjectCount = await deps.countOrgProjects(organizationId);
      } catch {
        existingProjectCount = 0;
      }
    }

    const storageQuotaBytes = calculateStorageQuotaBytes(existingProjectCount);

    if (!deps.createProject) {
      return jsonResponse(500, { error: 'Project creator not configured' });
    }

    const { projectId, project } = await deps.createProject({
      uid: auth.uid,
      payload,
      organizationId,
      storageQuotaBytes,
      userData: userData as Record<string, unknown> | null,
    });

    if (deps.afterCreated && organizationId) {
      try {
        await deps.afterCreated({
          uid: auth.uid,
          organizationId,
          projectId,
          propertyAddress: payload.property_address,
          actorName: userData?.displayName || userData?.email || 'User',
        });
      } catch {
        // non-blocking
      }
    }

    return jsonResponse(201, {
      success: true,
      projectId,
      project_id: projectId,
      storageQuotaBytes,
      project,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Projects Create API Error]:', message);
    return jsonResponse(500, { error: 'Failed to create project', details: message });
  }
}

export { phaseToCurrentPhase, calculateStorageQuotaBytes, projectCreateSchema };
