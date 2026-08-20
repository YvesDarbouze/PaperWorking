import { jsonResponse, type RouteResult } from '../../http/response.js';
import type { RequireAuthFn } from '../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../lib/auth/auth-types.js';
import {
  parseReconciliationListQuery,
  validateStartReconciliationBody,
} from '../../lib/reconciliations/validation.js';

export type StartReconciliationFn = (input: {
  projectId: string;
  month: number;
  year: number;
  uid: string;
  bankStatementBalance?: number;
}) => Promise<Record<string, unknown>>;

export type ListReconciliationPeriodsFn = (
  query: {
    projectId: string;
    month?: number;
    year?: number;
    status?: string;
  },
) => Promise<Array<Record<string, unknown>>>;

export interface ReconciliationsPostDeps {
  requireAuth?: RequireAuthFn;
  startReconciliation?: StartReconciliationFn;
}

export interface ReconciliationsGetDeps {
  requireAuth?: RequireAuthFn;
  listPeriods?: ListReconciliationPeriodsFn;
}

export interface ReconciliationsGetQuery {
  projectId?: string | null;
  month?: string | null;
  year?: string | null;
  status?: string | null;
}

/**
 * POST /api/reconciliations — start or fetch reconciliation period.
 */
export async function handleReconciliationsPost(
  body: Record<string, unknown>,
  deps: ReconciliationsPostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const validated = validateStartReconciliationBody(body);
  if (!validated.ok) {
    return jsonResponse(400, { success: false, error: validated.error });
  }

  try {
    const period = deps.startReconciliation
      ? await deps.startReconciliation({
          ...validated.value,
          uid: auth.uid,
        })
      : { id: 'period-mock', ...validated.value };

    return jsonResponse(200, { success: true, period });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[POST /api/reconciliations] Error:', message);
    return jsonResponse(500, { success: false, error: message });
  }
}

/**
 * GET /api/reconciliations — list periods for a project.
 */
export async function handleReconciliationsGet(
  query: ReconciliationsGetQuery,
  deps: ReconciliationsGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const parsed = parseReconciliationListQuery(query);
  if (!parsed.ok) {
    return jsonResponse(400, { success: false, error: parsed.error });
  }

  try {
    const periods = deps.listPeriods ? await deps.listPeriods(parsed.value) : [];
    return jsonResponse(200, { success: true, periods });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[GET /api/reconciliations] Error:', message);
    return jsonResponse(500, { success: false, error: message });
  }
}
