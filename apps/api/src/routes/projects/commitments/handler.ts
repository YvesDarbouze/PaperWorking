import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  filterCommitmentsForViewer,
  validateCreateCommitmentBody,
  type CommitmentPartyType,
  type CommitmentStatus,
  type CreateCommitmentBody,
} from '../../../lib/commitments/validation.js';

export interface ProjectAccessContext {
  role: string;
  phasePermissions?: Record<string, { canEdit?: boolean }>;
}

export interface CreateCommitmentInput {
  name: string;
  amountCents: number;
  status: CommitmentStatus;
  email: string | null;
  notes: string | null;
  partyType: CommitmentPartyType;
}

export type VerifyProjectAccessFn = (input: {
  projectId: string;
  uid: string;
  email?: string | null;
}) => Promise<ProjectAccessContext | null>;

export type ListCommitmentsFn = (projectId: string) => Promise<Array<Record<string, unknown>>>;

export type CreateCommitmentFn = (input: {
  projectId: string;
  uid: string;
  email?: string | null;
  body: CreateCommitmentInput;
}) => Promise<Record<string, unknown>>;

export interface ProjectCommitmentsGetDeps {
  requireAuth?: RequireAuthFn;
  verifyAccess?: VerifyProjectAccessFn;
  listCommitments?: ListCommitmentsFn;
  getViewerEmails?: (uid: string, email?: string | null) => Promise<string[]>;
}

export interface ProjectCommitmentsPostDeps {
  requireAuth?: RequireAuthFn;
  verifyAccess?: VerifyProjectAccessFn;
  createCommitment?: CreateCommitmentFn;
}

/**
 * GET /api/projects/[id]/commitments
 */
export async function handleProjectCommitmentsGet(
  projectId: string,
  deps: ProjectCommitmentsGetDeps = {},
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

    const commitments = deps.listCommitments ? await deps.listCommitments(projectId) : [];
    const viewerEmails = deps.getViewerEmails
      ? await deps.getViewerEmails(auth.uid, auth.email)
      : [auth.email ?? ''].filter(Boolean);

    const filtered = filterCommitmentsForViewer(
      commitments as Array<{ email?: string | null; uid?: string; createdByUid?: string }>,
      access.role === 'Lead Investor',
      viewerEmails,
      auth.uid,
    );

    return jsonResponse(200, { commitments: filtered });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch commitments';
    console.error('[Commitments GET]', message);
    return jsonResponse(500, { error: 'Failed to fetch commitments' });
  }
}

/**
 * POST /api/projects/[id]/commitments
 */
export async function handleProjectCommitmentsPost(
  projectId: string,
  body: CreateCommitmentBody,
  deps: ProjectCommitmentsPostDeps = {},
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
      const canEdit = access.phasePermissions?.['phase-2']?.canEdit ?? true;
      if (!canEdit) {
        return jsonResponse(403, { error: 'Edit permission denied for this phase' });
      }
    }

    const validated = validateCreateCommitmentBody(body, access.role === 'Lead Investor');
    if (!validated.ok) {
      return jsonResponse(validated.status, { error: validated.error });
    }

    const targetEmail =
      access.role === 'Lead Investor'
        ? validated.value.email
        : auth.email ?? null;

    const created = deps.createCommitment
      ? await deps.createCommitment({
          projectId,
          uid: auth.uid,
          email: auth.email,
          body: { ...validated.value, email: targetEmail },
        })
      : { id: `commitment_${Date.now()}`, ...validated.value, email: targetEmail };

    return jsonResponse(201, created);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create commitment';
    console.error('[Commitments POST]', message);
    return jsonResponse(500, { error: 'Failed to create commitment' });
  }
}
