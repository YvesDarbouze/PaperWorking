import { jsonResponse, type RouteResult } from '../../../../http/response.js';
import type { RequireAuthFn } from '../../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../../lib/auth/auth-types.js';

export interface PlaidConnectionOwnership {
  id: string;
  userId: string;
  status: string;
  institutionName?: string;
}

export type GetPlaidConnectionFn = (
  connectionId: string,
) => Promise<PlaidConnectionOwnership | null>;

export type DisconnectPlaidConnectionFn = (input: {
  connectionId: string;
  uid: string;
  connection: PlaidConnectionOwnership;
}) => Promise<void>;

export type TrackPlaidDisconnectFn = (input: {
  uid: string;
  connectionId: string;
  institutionName?: string;
}) => Promise<void>;

export interface PlaidConnectionDisconnectPostDeps {
  requireAuth?: RequireAuthFn;
  getConnection?: GetPlaidConnectionFn;
  disconnectConnection?: DisconnectPlaidConnectionFn;
  trackDisconnect?: TrackPlaidDisconnectFn;
}

/**
 * POST /api/plaid/connections/[connectionId]/disconnect
 */
export async function handlePlaidConnectionDisconnectPost(
  connectionId: string,
  deps: PlaidConnectionDisconnectPostDeps = {},
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

  const conn = deps.getConnection ? await deps.getConnection(connectionId) : null;
  if (!conn) {
    return jsonResponse(404, { success: false, error: 'Connection not found' });
  }

  if (conn.userId !== auth.uid) {
    return jsonResponse(403, { success: false, error: 'Forbidden' });
  }

  if (conn.status === 'DISCONNECTED') {
    return jsonResponse(200, { success: true, already: true });
  }

  try {
    if (deps.disconnectConnection) {
      await deps.disconnectConnection({
        connectionId,
        uid: auth.uid,
        connection: conn,
      });
    }

    if (deps.trackDisconnect) {
      await deps.trackDisconnect({
        uid: auth.uid,
        connectionId,
        institutionName: conn.institutionName,
      }).catch(() => {});
    }

    return jsonResponse(200, { success: true });
  } catch (err: unknown) {
    console.error('[disconnect] Failed to update PlaidConnection status:', err);
    return jsonResponse(500, { success: false, error: 'Failed to disconnect' });
  }
}
