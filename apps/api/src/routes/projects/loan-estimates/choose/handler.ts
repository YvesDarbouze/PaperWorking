import { jsonResponse, type RouteResult } from '../../../../http/response.js';
import type { RequireAuthFn } from '../../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../../lib/auth/auth-types.js';
import { buildLoanSyncPatchFromEstimate } from '../../../../lib/projects/loans.js';

export type VerifyProjectLoansAccessFn = (
  projectId: string,
  uid: string,
  email?: string | null,
) => Promise<{
  authorized: boolean;
  role: string;
  project: Record<string, unknown>;
} | null>;

export type LoadLoanEstimateFn = (
  projectId: string,
  estimateId: string,
) => Promise<Record<string, unknown> | null>;

export type ChooseLoanEstimateFn = (input: {
  projectId: string;
  estimateId: string;
  estimate: Record<string, unknown>;
  loanRecordId?: string;
}) => Promise<void>;

export type TrackLoanEstimateChosenFn = (input: {
  uid: string;
  projectId: string;
  estimateId: string;
  estimate: Record<string, unknown>;
}) => Promise<void>;

export interface ProjectsLoanEstimateChoosePostDeps {
  requireAuth?: RequireAuthFn;
  verifyAccess?: VerifyProjectLoansAccessFn;
  loadEstimate?: LoadLoanEstimateFn;
  chooseEstimate?: ChooseLoanEstimateFn;
  trackEvent?: TrackLoanEstimateChosenFn;
}

/**
 * POST /api/projects/[id]/loan-estimates/[estimateId]/choose
 */
export async function handleProjectsLoanEstimateChoosePost(
  projectId: string,
  estimateId: string,
  deps: ProjectsLoanEstimateChoosePostDeps = {},
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
    if (access.role !== 'Lead Investor') {
      return jsonResponse(403, {
        error: 'Forbidden: only Lead Investors can choose loan estimates',
      });
    }

    const estimate = deps.loadEstimate ? await deps.loadEstimate(projectId, estimateId) : null;
    if (!estimate) {
      return jsonResponse(404, { error: 'Estimate candidate not found' });
    }

    if (deps.chooseEstimate) {
      await deps.chooseEstimate({
        projectId,
        estimateId,
        estimate,
        loanRecordId:
          typeof estimate.loanRecordId === 'string' ? estimate.loanRecordId : undefined,
      });
    } else {
      buildLoanSyncPatchFromEstimate(estimate);
    }

    if (deps.trackEvent) {
      await deps.trackEvent({
        uid: auth.uid,
        projectId,
        estimateId,
        estimate,
      }).catch(() => undefined);
    }

    return jsonResponse(200, {
      success: true,
      message: 'Loan estimate chosen and synced to active loan.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Choose Estimate POST]', message);
    return jsonResponse(500, { error: 'Failed to choose estimate' });
  }
}
