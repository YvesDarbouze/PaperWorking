import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  canAddLoanEstimate,
  validateLoanEstimateCreateBody,
} from '../../../lib/projects/loan-estimates.js';

export type VerifyProjectLoansAccessFn = (
  projectId: string,
  uid: string,
  email?: string | null,
) => Promise<{
  authorized: boolean;
  role: string;
  partyId?: string;
  project: Record<string, unknown>;
} | null>;

export type ListLoanEstimatesFn = (projectId: string) => Promise<Array<Record<string, unknown>>>;
export type CreateLoanEstimateFn = (
  projectId: string,
  estimate: Record<string, unknown>,
) => Promise<Record<string, unknown>>;
export type DeleteLoanEstimateFn = (projectId: string, estimateId: string) => Promise<boolean>;

export interface ProjectsLoanEstimatesGetDeps {
  requireAuth?: RequireAuthFn;
  verifyAccess?: VerifyProjectLoansAccessFn;
  listEstimates?: ListLoanEstimatesFn;
}

export interface ProjectsLoanEstimatesPostDeps {
  requireAuth?: RequireAuthFn;
  verifyAccess?: VerifyProjectLoansAccessFn;
  createEstimate?: CreateLoanEstimateFn;
}

export interface ProjectsLoanEstimateDeleteDeps {
  requireAuth?: RequireAuthFn;
  verifyAccess?: VerifyProjectLoansAccessFn;
  deleteEstimate?: DeleteLoanEstimateFn;
}

/**
 * GET /api/projects/[id]/loan-estimates
 */
export async function handleProjectsLoanEstimatesGet(
  projectId: string,
  deps: ProjectsLoanEstimatesGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const access = deps.verifyAccess
      ? await deps.verifyAccess(projectId, auth.uid, auth.email)
      : { authorized: true, role: 'Lead Investor', project: {} };
    if (!access?.authorized) {
      return jsonResponse(403, { error: 'Project not found or access denied' });
    }

    const estimates = deps.listEstimates ? await deps.listEstimates(projectId) : [];
    return jsonResponse(200, { estimates });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Loan Estimates GET]', message);
    return jsonResponse(500, { error: 'Failed to fetch loan estimates' });
  }
}

/**
 * POST /api/projects/[id]/loan-estimates
 */
export async function handleProjectsLoanEstimatesPost(
  projectId: string,
  body: Record<string, unknown>,
  deps: ProjectsLoanEstimatesPostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const access = deps.verifyAccess
      ? await deps.verifyAccess(projectId, auth.uid, auth.email)
      : { authorized: true, role: 'Lead Investor', project: {} };
    if (!access?.authorized) {
      return jsonResponse(403, { error: 'Project not found or access denied' });
    }

    const gate = canAddLoanEstimate(access.role, access.partyId);
    if (!gate.ok) return jsonResponse(gate.status, { error: gate.error });

    const validated = validateLoanEstimateCreateBody(body);
    if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

    const now = new Date().toISOString();
    const estimatePayload = {
      ...validated.estimate,
      id: crypto.randomUUID(),
      projectId,
      createdAt: now,
      updatedAt: now,
    };

    const estimate = deps.createEstimate
      ? await deps.createEstimate(projectId, estimatePayload)
      : estimatePayload;
    return jsonResponse(201, { estimate });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Loan Estimates POST]', message);
    return jsonResponse(500, { error: 'Failed to create loan estimate' });
  }
}

/**
 * DELETE /api/projects/[id]/loan-estimates/[estimateId]
 */
export async function handleProjectsLoanEstimateDelete(
  projectId: string,
  estimateId: string,
  deps: ProjectsLoanEstimateDeleteDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const access = deps.verifyAccess
      ? await deps.verifyAccess(projectId, auth.uid, auth.email)
      : { authorized: true, role: 'Lead Investor', project: {} };
    if (!access?.authorized) {
      return jsonResponse(403, { error: 'Project not found or access denied' });
    }

    const deleted = deps.deleteEstimate ? await deps.deleteEstimate(projectId, estimateId) : true;
    if (!deleted) {
      return jsonResponse(404, { error: 'Estimate candidate not found' });
    }

    return jsonResponse(200, { success: true, message: 'Estimate candidate deleted.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Delete Estimate DELETE]', message);
    return jsonResponse(500, { error: 'Failed to delete estimate' });
  }
}
