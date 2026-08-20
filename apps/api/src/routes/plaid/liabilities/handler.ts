import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  flattenMortgageLiabilities,
  type RawBankConnectionWithLiabilities,
} from '../../../lib/plaid/liabilities.js';

export type ListMortgageLiabilitiesFn = (
  userId: string,
) => Promise<RawBankConnectionWithLiabilities[]>;

export interface PlaidLiabilitiesGetDeps {
  requireAuth?: RequireAuthFn;
  listLiabilities?: ListMortgageLiabilitiesFn;
}

/**
 * GET /api/plaid/liabilities
 */
export async function handlePlaidLiabilitiesGet(
  deps: PlaidLiabilitiesGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  try {
    const connections = deps.listLiabilities
      ? await deps.listLiabilities(auth.uid)
      : [];

    const liabilities = flattenMortgageLiabilities(connections);
    return jsonResponse(200, { success: true, liabilities });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[GET /api/plaid/liabilities] Error:', message);
    return jsonResponse(500, { success: false, error: 'Failed to load mortgage liabilities' });
  }
}
