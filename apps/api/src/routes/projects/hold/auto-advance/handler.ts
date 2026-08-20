import { jsonResponse, type RouteResult } from '../../../../http/response.js';
import type { RequireAuthFn } from '../../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../../lib/auth/auth-types.js';
import {
  buildHoldAutoAdvanceUpdate,
  checkHoldExitGating,
  validateHoldAutoAdvanceBody,
} from '../../../../lib/projects/hold-auto-advance.js';

export type VerifyHoldAutoAdvanceAccessFn = (
  projectId: string,
  uid: string,
  email?: string | null,
) => Promise<{
  authorized: boolean;
  project: Record<string, unknown>;
} | null>;
export type AuthorizePhaseMutationFn = (
  access: { role?: string },
  phase: string,
) => { authorized: boolean; error?: string; status?: number };
export type ApplyHoldAutoAdvanceFn = (input: {
  projectId: string;
  update: Record<string, unknown>;
  uid: string;
  actorName: string;
  dealAddress: string;
}) => Promise<void>;

/**
 * POST /api/projects/[id]/hold/auto-advance
 */
export async function handleProjectsHoldAutoAdvancePost(
  projectId: string,
  body: Record<string, unknown>,
  deps: {
    requireAuth?: RequireAuthFn;
    verifyAccess?: VerifyHoldAutoAdvanceAccessFn;
    authorizeMutation?: AuthorizePhaseMutationFn;
    applyAdvance?: ApplyHoldAutoAdvanceFn;
  } = {},
): Promise<RouteResult> {
  if (!projectId) return jsonResponse(400, { error: 'Missing project ID' });
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const validated = validateHoldAutoAdvanceBody(body);
    if (!validated.ok) {
      return jsonResponse(validated.status, {
        error: validated.error,
        details: validated.details,
      });
    }

    const access = deps.verifyAccess
      ? await deps.verifyAccess(projectId, auth.uid, auth.email)
      : { authorized: true, project: { financials: {} } };
    if (!access?.authorized) return jsonResponse(403, { error: 'Access denied' });

    if (deps.authorizeMutation) {
      const gate = deps.authorizeMutation({ role: String(access.project.role || '') }, 'phase-3');
      if (!gate.authorized) return jsonResponse(gate.status || 403, { error: gate.error });
    }

    const financials = (access.project.financials as Record<string, unknown> | undefined) || {};
    const gating = checkHoldExitGating(financials);
    if (!gating.ok) return jsonResponse(400, { error: gating.error });

    const update = buildHoldAutoAdvanceUpdate({
      existingFinancials: financials,
      costBasis: validated.costBasis,
      capitalizedImprovements: validated.capitalizedImprovements,
      holdingCosts: validated.holdingCosts,
      outcome: validated.outcome,
    });

    if (deps.applyAdvance) {
      await deps.applyAdvance({
        projectId,
        update,
        uid: auth.uid,
        actorName: auth.email || 'Lead Investor',
        dealAddress: String(access.project.propertyName || 'the project'),
      });
    }

    return jsonResponse(200, { success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Hold AutoAdvance POST]', message);
    return jsonResponse(500, { error: 'Failed to auto-advance hold phase', details: message });
  }
}
