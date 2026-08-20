import { htmlResponse, jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import { buildGoogleDriveCallbackHtml } from '../../../lib/integrations/oauth.js';

export type BuildGoogleDriveAuthUrlFn = (uid: string) => Promise<string> | string;

export type ExchangeGoogleDriveCodeFn = (input: {
  code: string;
  state: string;
}) => Promise<{ uid: string; email: string; refreshToken?: string | null }>;

export type SaveGoogleDriveConnectionFn = (input: {
  uid: string;
  email: string;
  refreshToken?: string | null;
}) => Promise<void>;

export interface IntegrationsGoogleDriveAuthorizeGetDeps {
  requireAuth?: RequireAuthFn;
  buildAuthUrl?: BuildGoogleDriveAuthUrlFn;
}

export interface IntegrationsGoogleDriveCallbackGetDeps {
  exchangeCode?: ExchangeGoogleDriveCodeFn;
  saveConnection?: SaveGoogleDriveConnectionFn;
}

/**
 * GET /api/integrations/google-drive/authorize
 */
export async function handleIntegrationsGoogleDriveAuthorizeGet(
  deps: IntegrationsGoogleDriveAuthorizeGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const authUrl = deps.buildAuthUrl
      ? await deps.buildAuthUrl(auth.uid)
      : `https://accounts.google.com/o/oauth2/v2/auth?state=${auth.uid}`;
    return jsonResponse(200, { authUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse(500, { error: message || 'Failed to build auth URL' });
  }
}

/**
 * GET /api/integrations/google-drive/callback
 */
export async function handleIntegrationsGoogleDriveCallbackGet(
  query: { code?: string | null; state?: string | null; error?: string | null },
  deps: IntegrationsGoogleDriveCallbackGetDeps = {},
): Promise<RouteResult> {
  if (query.error) {
    return htmlResponse(400, buildGoogleDriveCallbackHtml(false, `Google OAuth error: ${query.error}`));
  }

  const code = query.code?.trim() || '';
  const state = query.state?.trim() || '';
  if (!code || !state) {
    return htmlResponse(400, buildGoogleDriveCallbackHtml(false, 'Missing code or state parameter'));
  }

  try {
    const exchanged = deps.exchangeCode
      ? await deps.exchangeCode({ code, state })
      : { uid: state, email: 'drive-user@test.com', refreshToken: null };

    if (deps.saveConnection) {
      await deps.saveConnection({
        uid: exchanged.uid,
        email: exchanged.email,
        refreshToken: exchanged.refreshToken,
      });
    }

    return htmlResponse(200, buildGoogleDriveCallbackHtml(true));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return htmlResponse(400, buildGoogleDriveCallbackHtml(false, message || 'Token exchange failed'));
  }
}
