import { jsonResponse, type RouteResult } from '../../../../http/response.js';
import type { RequireAuthFn } from '../../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../../lib/auth/auth-types.js';
import { verifyPlaidConnectionOwnership } from '../../../../lib/plaid/connection.js';

export type GetPlaidConnectionFn = (
  connectionId: string,
) => Promise<{ userId: string; accessToken?: string } | null>;

export type RevokePlaidItemFn = (accessToken: string) => Promise<void>;

export type DeletePlaidConnectionFn = (connectionId: string) => Promise<void>;

export type TrackPlaidEventFn = (input: {
  event: string;
  uid: string;
  connectionId: string;
}) => Promise<void>;

export interface PlaidConnectionByIdDeleteDeps {
  requireAuth?: RequireAuthFn;
  getConnection?: GetPlaidConnectionFn;
  revokeItem?: RevokePlaidItemFn;
  deleteConnection?: DeletePlaidConnectionFn;
  trackEvent?: TrackPlaidEventFn;
  bankingProvider?: string;
}

/**
 * DELETE /api/plaid/connections/[connectionId]
 */
export async function handlePlaidConnectionByIdDelete(
  connectionId: string,
  deps: PlaidConnectionByIdDeleteDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  if (!connectionId) {
    return jsonResponse(400, { success: false, error: 'connectionId is required' });
  }

  const connection = deps.getConnection ? await deps.getConnection(connectionId) : { userId: auth.uid };
  const ownership = verifyPlaidConnectionOwnership(connection, auth.uid);
  if (!ownership.ok) {
    return jsonResponse(ownership.status, { success: false, error: ownership.error });
  }

  if (deps.bankingProvider === 'plaid' && connection?.accessToken && deps.revokeItem) {
    try {
      await deps.revokeItem(connection.accessToken);
    } catch (err: unknown) {
      console.error('[DELETE /api/plaid/connections] Plaid item revocation failed (continuing):', err);
    }
  }

  try {
    if (deps.deleteConnection) {
      await deps.deleteConnection(connectionId);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[DELETE /api/plaid/connections] Failed to delete connection:', message);
    return jsonResponse(500, { success: false, error: 'Failed to disconnect bank account' });
  }

  if (deps.trackEvent) {
    await deps.trackEvent({
      event: 'plaid_connection_disconnected',
      uid: auth.uid,
      connectionId,
    }).catch(() => undefined);
  }

  return jsonResponse(200, { success: true });
}
