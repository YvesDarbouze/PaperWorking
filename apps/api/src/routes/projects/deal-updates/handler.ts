import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import { validateDealUpdateBody, type DealUpdateBody } from '../../../lib/deal-updates/validation.js';

export type VerifyProjectMembershipFn = (
  projectId: string,
  uid: string,
) => Promise<Record<string, unknown> | null>;

export type ListDealUpdatesFn = (projectId: string) => Promise<Array<Record<string, unknown>>>;

export type CreateDealUpdateFn = (input: {
  projectId: string;
  uid: string;
  organizationId?: string | null;
  title: string | null;
  body: string;
  authorName: string;
}) => Promise<Record<string, unknown>>;

export interface ProjectDealUpdatesGetDeps {
  requireAuth?: RequireAuthFn;
  verifyMembership?: VerifyProjectMembershipFn;
  listUpdates?: ListDealUpdatesFn;
}

export interface ProjectDealUpdatesPostDeps {
  requireAuth?: RequireAuthFn;
  verifyMembership?: VerifyProjectMembershipFn;
  resolveAuthorName?: (uid: string) => Promise<string>;
  createUpdate?: CreateDealUpdateFn;
}

/**
 * GET /api/projects/[id]/dealUpdates
 */
export async function handleProjectDealUpdatesGet(
  projectId: string,
  deps: ProjectDealUpdatesGetDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { error: 'Auth not configured' });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    const project = deps.verifyMembership
      ? await deps.verifyMembership(projectId, auth.uid)
      : { organizationId: null };

    if (!project) {
      return jsonResponse(403, { error: 'Project not found or access denied' });
    }

    const updates = deps.listUpdates ? await deps.listUpdates(projectId) : [];
    return jsonResponse(200, { updates });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch deal updates';
    console.error('[DealUpdates GET]', message);
    return jsonResponse(500, { error: 'Failed to fetch deal updates' });
  }
}

/**
 * POST /api/projects/[id]/dealUpdates
 */
export async function handleProjectDealUpdatesPost(
  projectId: string,
  body: DealUpdateBody,
  deps: ProjectDealUpdatesPostDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { error: 'Auth not configured' });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    const project = deps.verifyMembership
      ? await deps.verifyMembership(projectId, auth.uid)
      : { organizationId: null };

    if (!project) {
      return jsonResponse(403, { error: 'Project not found or access denied' });
    }

    const validated = validateDealUpdateBody(body);
    if (!validated.ok) {
      return jsonResponse(validated.status, { error: validated.error });
    }

    const authorName = deps.resolveAuthorName
      ? await deps.resolveAuthorName(auth.uid)
      : 'LeadInvestor';

    const created = deps.createUpdate
      ? await deps.createUpdate({
          projectId,
          uid: auth.uid,
          organizationId: (project.organizationId as string | null | undefined) ?? null,
          title: validated.title,
          body: validated.body,
          authorName,
        })
      : {
          id: `update_${Date.now()}`,
          projectId,
          authorUid: auth.uid,
          authorName,
          title: validated.title,
          body: validated.body,
        };

    return jsonResponse(201, created);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create deal update';
    console.error('[DealUpdates POST]', message);
    return jsonResponse(500, { error: 'Failed to create deal update' });
  }
}
