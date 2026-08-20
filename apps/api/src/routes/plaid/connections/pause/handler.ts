import { jsonResponse, type RouteResult } from '../../../../http/response.js';
import type { RequireAuthFn } from '../../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../../lib/auth/auth-types.js';
import { verifyPlaidConnectionOwnership } from '../../../../lib/plaid/connection.js';

export type GetPlaidConnectionStatusFn = (
  connectionId: string,
) => Promise<{ userId: string; status: string } | null>;

export type UpdatePlaidConnectionStatusFn = (
  connectionId: string,
  status: 'paused' | 'active',
) => Promise<void>;

export type TrackPlaidEventFn = (input: {
  event: string;
  uid: string;
  connectionId: string;
}) => Promise<void>;

export interface PlaidConnectionPauseDeps {
  requireAuth?: RequireAuthFn;
  getConnection?: GetPlaidConnectionStatusFn;
  updateStatus?: UpdatePlaidConnectionStatusFn;
  trackEvent?: TrackPlaidEventFn;
}

/**
 * POST /api/plaid/connections/[connectionId]/pause
 */
export async function handlePlaidConnectionPausePost(
  connectionId: string,
  deps: PlaidConnectionPauseDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const connection = deps.getConnection
    ? await deps.getConnection(connectionId)
    : { userId: auth.uid, status: 'active' };

  const ownership = verifyPlaidConnectionOwnership(connection, auth.uid);
  if (!ownership.ok) {
    return jsonResponse(ownership.status, { success: false, error: ownership.error });
  }

  if (connection!.status === 'paused') {
    return jsonResponse(200, { success: true, status: 'paused', message: 'Already paused' });
  }

  if (deps.updateStatus) {
    await deps.updateStatus(connectionId, 'paused');
  }

  if (deps.trackEvent) {
    await deps.trackEvent({
      event: 'plaid_connection_paused',
      uid: auth.uid,
      connectionId,
    }).catch(() => undefined);
  }

  return jsonResponse(200, { success: true, status: 'paused' });
}

/**
 * DELETE /api/plaid/connections/[connectionId]/pause — resume connection.
 */
export async function handlePlaidConnectionPauseDelete(
  connectionId: string,
  deps: PlaidConnectionPauseDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const connection = deps.getConnection
    ? await deps.getConnection(connectionId)
    : { userId: auth.uid, status: 'paused' };

  const ownership = verifyPlaidConnectionOwnership(connection, auth.uid);
  if (!ownership.ok) {
    return jsonResponse(ownership.status, { success: false, error: ownership.error });
  }

  if (connection!.status === 'active') {
    return jsonResponse(200, { success: true, status: 'active', message: 'Already active' });
  }

  if (deps.updateStatus) {
    await deps.updateStatus(connectionId, 'active');
  }

  if (deps.trackEvent) {
    await deps.trackEvent({
      event: 'plaid_connection_resumed',
      uid: auth.uid,
      connectionId,
    }).catch(() => undefined);
  }

  return jsonResponse(200, { success: true, status: 'active' });
}
