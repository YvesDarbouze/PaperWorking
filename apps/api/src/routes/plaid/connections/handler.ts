import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';

export interface PlaidConnectionSafeRecord {
  id: string;
  [key: string]: unknown;
}

export type ListPlaidConnectionsFn = (filters: {
  uid: string;
  model: string | null;
  projectId: string | null;
}) => Promise<{ connections: PlaidConnectionSafeRecord[]; model?: string }>;

export interface PlaidConnectionsGetQuery {
  model?: string | null;
  projectId?: string | null;
}

export interface PlaidConnectionsGetDeps {
  requireAuth?: RequireAuthFn;
  listConnections?: ListPlaidConnectionsFn;
}

/**
 * GET /api/plaid/connections — v1 BankConnection or v2 PlaidConnection (no access tokens).
 */
export async function handlePlaidConnectionsGet(
  query: PlaidConnectionsGetQuery,
  deps: PlaidConnectionsGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  try {
    const result = deps.listConnections
      ? await deps.listConnections({
          uid: auth.uid,
          model: query.model ?? null,
          projectId: query.projectId ?? null,
        })
      : { connections: [] };

    if (query.model === 'v2') {
      return jsonResponse(200, {
        success: true,
        connections: result.connections,
        model: 'v2',
      });
    }

    return jsonResponse(200, { success: true, connections: result.connections });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[GET /api/plaid/connections] Error:', message);
    return jsonResponse(500, { success: false, error: 'Failed to load bank connections' });
  }
}
