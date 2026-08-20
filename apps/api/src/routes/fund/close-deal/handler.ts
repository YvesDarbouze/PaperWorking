import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  parseCloseDealBody,
  validateSourcesUsesBalance,
  type CloseDealBody,
} from '../../../lib/fund/close-deal.js';

export type ExecuteCloseDealFn = (input: {
  uid: string;
  parsed: NonNullable<ReturnType<typeof parseCloseDealBody>>;
}) => Promise<void>;

export interface FundCloseDealPostDeps {
  requireAuth?: RequireAuthFn;
  closeDeal?: ExecuteCloseDealFn;
}

/**
 * POST /api/fund/close-deal
 */
export async function handleFundCloseDealPost(
  body: CloseDealBody,
  deps: FundCloseDealPostDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { success: false, error: 'Auth not configured' });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    const parsed = parseCloseDealBody(body);
    if (!parsed) {
      return jsonResponse(400, { success: false, error: 'projectId is required' });
    }

    const balance = validateSourcesUsesBalance(parsed);
    if (!balance.ok) {
      return jsonResponse(400, {
        success: false,
        error: balance.error,
        variance: balance.variance,
      });
    }

    if (deps.closeDeal) {
      await deps.closeDeal({ uid: auth.uid, parsed });
    }

    return jsonResponse(200, { success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[Close Deal API] Error:', message);
    return jsonResponse(500, { success: false, error: message });
  }
}
