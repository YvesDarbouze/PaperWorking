import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';

export interface IntegrationStatus {
  connected: boolean;
  email?: string | null;
  provider?: string | null;
}

export interface IntegrationsStatusResponse {
  google_drive: IntegrationStatus;
  mls: IntegrationStatus;
}

export type GetIntegrationsStatusFn = (uid: string) => Promise<IntegrationsStatusResponse>;

export interface IntegrationsStatusGetDeps {
  requireAuth?: RequireAuthFn;
  getStatus?: GetIntegrationsStatusFn;
}

const DEFAULT_STATUS: IntegrationsStatusResponse = {
  google_drive: { connected: false, email: null },
  mls: { connected: false, provider: null },
};

/**
 * GET /api/integrations/status — caller's google_drive + mls integration status.
 */
export async function handleIntegrationsStatusGet(
  deps: IntegrationsStatusGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const status = deps.getStatus
    ? await deps.getStatus(auth.uid)
    : DEFAULT_STATUS;

  return jsonResponse(200, status);
}
