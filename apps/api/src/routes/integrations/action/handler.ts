import {
  htmlResponse,
  jsonResponse,
  redirectResponse,
  type RouteResult,
} from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  buildIntegrationCallbackHtml,
  buildMockOAuthCallbackUrl,
  parseIntegrationActionPath,
} from '../../../lib/integrations/oauth.js';

export type ResolveIntegrationOrgIdFn = (uid: string) => Promise<string>;
export type SaveIntegrationConnectionFn = (
  orgId: string,
  provider: string,
  payload: Record<string, unknown>,
) => Promise<void>;
export type DisconnectIntegrationFn = (orgId: string, provider: string) => Promise<void>;

export interface IntegrationsActionHandlerDeps {
  requireAuth?: RequireAuthFn;
  resolveOrgId?: ResolveIntegrationOrgIdFn;
  saveConnection?: SaveIntegrationConnectionFn;
  disconnect?: DisconnectIntegrationFn;
}

/**
 * GET /api/integrations/[provider]/authorize|callback
 */
export async function handleIntegrationsActionGet(
  actionPath: string[],
  query: { code?: string | null },
  origin: string,
  deps: IntegrationsActionHandlerDeps = {},
): Promise<RouteResult> {
  const parsed = parseIntegrationActionPath(actionPath);
  if (!parsed.provider || !parsed.action) {
    return jsonResponse(404, { error: 'Endpoint not found' });
  }

  if (parsed.action === 'authorize') {
    return redirectResponse(buildMockOAuthCallbackUrl(origin, parsed.provider));
  }

  if (parsed.action === 'callback') {
    let orgId = 'org_placeholder';
    if (deps.requireAuth) {
      const auth = await deps.requireAuth();
      if (!isAuthFailure(auth) && deps.resolveOrgId) {
        orgId = await deps.resolveOrgId(auth.uid);
      }
    }

    if (deps.saveConnection) {
      await deps.saveConnection(orgId, parsed.provider, {
        connected: true,
        status: 'connected',
        connectedAt: new Date().toISOString(),
        code: query.code || 'no_code',
      });
    }

    return htmlResponse(200, buildIntegrationCallbackHtml(parsed.provider));
  }

  return jsonResponse(404, { error: 'Endpoint not found' });
}

/**
 * DELETE /api/integrations/[provider]/disconnect
 */
export async function handleIntegrationsActionDelete(
  actionPath: string[],
  deps: IntegrationsActionHandlerDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const parsed = parseIntegrationActionPath(actionPath);
  if (!parsed.provider || parsed.action !== 'disconnect') {
    return jsonResponse(404, { error: 'Endpoint not found' });
  }

  const orgId = deps.resolveOrgId
    ? await deps.resolveOrgId(auth.uid)
    : 'org_placeholder';
  if (deps.disconnect) await deps.disconnect(orgId, parsed.provider);
  return jsonResponse(200, { success: true });
}
