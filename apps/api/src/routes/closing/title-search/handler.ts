import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  deriveChainOfTitleStatus,
  validateTitleSearchBody,
} from '../../../lib/closing/title-search.js';

export type PersistTitleSearchFn = (input: {
  projectId: string;
  organizationId?: string;
  projectName?: string;
  checks: Array<Record<string, unknown>>;
  chainOfTitleStatus: string;
  uid: string;
  actorName: string;
}) => Promise<void>;

export interface ClosingTitleSearchPostDeps {
  requireAuth?: RequireAuthFn;
  verifyProjectAccess?: (input: { uid: string; projectId: string }) => Promise<boolean>;
  persistTitleSearch?: PersistTitleSearchFn;
}

/**
 * POST /api/closing/title-search
 */
export async function handleClosingTitleSearchPost(
  body: Record<string, unknown>,
  deps: ClosingTitleSearchPostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const validated = validateTitleSearchBody(body);
  if (!validated.ok) {
    return jsonResponse(validated.status, {
      success: false,
      ...(validated.providerDecisionRequired ? { providerDecisionRequired: true } : {}),
      error: validated.error,
    });
  }

  if (deps.verifyProjectAccess) {
    const allowed = await deps.verifyProjectAccess({
      uid: auth.uid,
      projectId: validated.projectId,
    });
    if (!allowed) {
      return jsonResponse(403, { error: 'Access denied' });
    }
  }

  const chainOfTitleStatus = deriveChainOfTitleStatus(validated.checks);

  try {
    if (deps.persistTitleSearch) {
      await deps.persistTitleSearch({
        projectId: validated.projectId,
        organizationId: validated.organizationId,
        projectName: validated.projectName,
        checks: validated.checks,
        chainOfTitleStatus,
        uid: auth.uid,
        actorName: auth.email || auth.uid,
      });
    }

    return jsonResponse(200, {
      success: true,
      data: {
        projectId: validated.projectId,
        chainOfTitleStatus,
        checks: validated.checks,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error('[title-search] Persist failed:', error);
    return jsonResponse(500, { success: false, error: 'Failed to persist title checks' });
  }
}
