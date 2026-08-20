import { jsonResponse, type RouteResult } from '../../../../http/response.js';
import type { RequireAuthFn } from '../../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../../lib/auth/auth-types.js';

export type TestMlsConnectionFn = () => Promise<{ ok: boolean; message: string; providerId?: string }>;
export type SaveMlsConnectionFn = (
  uid: string,
  input: { providerId: string },
) => Promise<void>;

export interface IntegrationsMlsConnectPostDeps {
  requireAuth?: RequireAuthFn;
  testConnection?: TestMlsConnectionFn;
  saveConnection?: SaveMlsConnectionFn;
}

/**
 * POST /api/integrations/mls/connect
 */
export async function handleIntegrationsMlsConnectPost(
  deps: IntegrationsMlsConnectPostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  let testResult: { ok: boolean; message: string; providerId?: string };
  try {
    testResult = deps.testConnection
      ? await deps.testConnection()
      : { ok: true, message: 'MLS connection successful', providerId: 'bridge' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse(502, { error: 'MLS connection failed', detail: message || 'Provider unreachable' });
  }

  if (!testResult.ok) {
    return jsonResponse(502, { error: testResult.message });
  }

  if (deps.saveConnection) {
    await deps.saveConnection(auth.uid, { providerId: testResult.providerId || 'bridge' });
  }

  return jsonResponse(200, { connected: true, message: testResult.message });
}
