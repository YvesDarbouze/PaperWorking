import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  validateProofOfFundsBody,
  type ProofOfFundsPostBody,
} from '../../../lib/proof-of-funds/actions.js';

export type ExecuteProofOfFundsActionFn = (input: {
  projectId: string;
  uid: string;
  action: string;
  sourceId: string | null;
  body: ProofOfFundsPostBody;
  isLead: boolean;
  userName: string;
}) => Promise<{
  proofOfFunds: Array<Record<string, unknown>>;
  completedFundCards: string[];
}>;

export interface ProjectProofOfFundsPostDeps {
  requireAuth?: RequireAuthFn;
  checkProjectAccess?: (input: { projectId: string; uid: string }) => Promise<
    | { ok: true; isLead: boolean; userName: string }
    | { ok: false; status: number; error: string }
  >;
  executeAction?: ExecuteProofOfFundsActionFn;
}

/**
 * POST /api/projects/[id]/proof-of-funds
 */
export async function handleProjectProofOfFundsPost(
  projectId: string,
  body: ProofOfFundsPostBody,
  deps: ProjectProofOfFundsPostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  if (!projectId?.trim()) {
    return jsonResponse(400, { success: false, error: 'projectId is required' });
  }

  const validated = validateProofOfFundsBody(body);
  if (!validated.ok) {
    return jsonResponse(validated.status, { success: false, error: validated.error });
  }

  if (validated.action === 'verify') {
    const access = deps.checkProjectAccess
      ? await deps.checkProjectAccess({ projectId, uid: auth.uid })
      : { ok: true as const, isLead: true, userName: auth.uid };

    if (!access.ok) {
      return jsonResponse(access.status, { success: false, error: access.error });
    }

    if (!access.isLead) {
      return jsonResponse(403, {
        success: false,
        error: 'Unauthorized. Only the Lead Investor can verify proof of funds.',
      });
    }
  }

  try {
    const access = deps.checkProjectAccess
      ? await deps.checkProjectAccess({ projectId, uid: auth.uid })
      : { ok: true as const, isLead: true, userName: auth.uid };

    if (!access.ok) {
      return jsonResponse(access.status, { success: false, error: access.error });
    }

    const result = deps.executeAction
      ? await deps.executeAction({
          projectId,
          uid: auth.uid,
          action: validated.action,
          sourceId: validated.sourceId,
          body: validated.body,
          isLead: access.isLead,
          userName: access.userName,
        })
      : { proofOfFunds: [], completedFundCards: [] };

    return jsonResponse(200, {
      success: true,
      proofOfFunds: result.proofOfFunds,
      completedFundCards: result.completedFundCards,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[POST /api/projects/proof-of-funds] Error:', message);
    return jsonResponse(500, { success: false, error: message });
  }
}
