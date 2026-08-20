import { jsonResponse, type RouteResult } from '../../../../http/response.js';
import type { RequireAuthFn } from '../../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../../lib/auth/auth-types.js';
import {
  userOwnsCommitment,
  validatePatchCommitmentFields,
  type PatchCommitmentBody,
} from '../../../../lib/commitments/validation.js';
import type { ProjectAccessContext, VerifyProjectAccessFn } from '../handler.js';

export type GetCommitmentFn = (
  projectId: string,
  commitmentId: string,
) => Promise<Record<string, unknown> | null>;

export type UpdateCommitmentFn = (input: {
  projectId: string;
  commitmentId: string;
  updates: Record<string, unknown>;
  uid: string;
}) => Promise<void>;

export type DeleteCommitmentFn = (projectId: string, commitmentId: string) => Promise<void>;

export interface ProjectCommitmentByIdDeps {
  requireAuth?: RequireAuthFn;
  verifyAccess?: VerifyProjectAccessFn;
  getCommitment?: GetCommitmentFn;
  getViewerEmails?: (uid: string, email?: string | null) => Promise<string[]>;
  updateCommitment?: UpdateCommitmentFn;
  deleteCommitment?: DeleteCommitmentFn;
}

/**
 * PATCH /api/projects/[id]/commitments/[cId]
 */
export async function handleProjectCommitmentPatch(
  projectId: string,
  commitmentId: string,
  body: PatchCommitmentBody,
  deps: ProjectCommitmentByIdDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { error: 'Auth not configured' });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    const access: ProjectAccessContext | null = deps.verifyAccess
      ? await deps.verifyAccess({ projectId, uid: auth.uid, email: auth.email })
      : { role: 'Lead Investor' };

    if (!access) {
      return jsonResponse(403, { error: 'Project not found or access denied' });
    }

    const existing = deps.getCommitment
      ? await deps.getCommitment(projectId, commitmentId)
      : { status: 'pledged', email: auth.email ?? null };

    if (!existing) {
      return jsonResponse(404, { error: 'Commitment not found' });
    }

    if (access.role !== 'Lead Investor') {
      const viewerEmails = deps.getViewerEmails
        ? await deps.getViewerEmails(auth.uid, auth.email)
        : [auth.email ?? ''].filter(Boolean);

      if (
        !userOwnsCommitment(
          existing as { email?: string | null; uid?: string; createdByUid?: string },
          viewerEmails,
          auth.uid,
        )
      ) {
        return jsonResponse(403, {
          error: "Access denied: cannot modify another investor's commitment",
        });
      }

      const canEdit = access.phasePermissions?.['phase-2']?.canEdit ?? true;
      if (!canEdit) {
        return jsonResponse(403, { error: 'Edit permission denied for this phase' });
      }
    }

    const validated = validatePatchCommitmentFields(
      body,
      access.role === 'Lead Investor',
      existing as { status?: string; email?: string | null; partyType?: string },
    );

    if (!validated.ok) {
      return jsonResponse(validated.status, { error: validated.error });
    }

    if (Object.keys(validated.updates).length > 0 && deps.updateCommitment) {
      await deps.updateCommitment({
        projectId,
        commitmentId,
        updates: validated.updates,
        uid: auth.uid,
      });
    }

    return jsonResponse(200, { success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update commitment';
    console.error('[Commitments PATCH]', message);
    return jsonResponse(500, { error: 'Failed to update commitment' });
  }
}

/**
 * DELETE /api/projects/[id]/commitments/[cId]
 */
export async function handleProjectCommitmentDelete(
  projectId: string,
  commitmentId: string,
  deps: ProjectCommitmentByIdDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { error: 'Auth not configured' });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    const access = deps.verifyAccess
      ? await deps.verifyAccess({ projectId, uid: auth.uid, email: auth.email })
      : { role: 'Lead Investor' };

    if (!access) {
      return jsonResponse(403, { error: 'Project not found or access denied' });
    }

    if (access.role !== 'Lead Investor') {
      return jsonResponse(403, { error: 'Forbidden: only Lead Investors can delete commitments' });
    }

    const existing = deps.getCommitment
      ? await deps.getCommitment(projectId, commitmentId)
      : { id: commitmentId };

    if (!existing) {
      return jsonResponse(404, { error: 'Commitment not found' });
    }

    if (deps.deleteCommitment) {
      await deps.deleteCommitment(projectId, commitmentId);
    }

    return jsonResponse(200, { success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete commitment';
    console.error('[Commitments DELETE]', message);
    return jsonResponse(500, { error: 'Failed to delete commitment' });
  }
}
