import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  buildSecuritySettingsUpdate,
  DEFAULT_SECURITY_SETTINGS,
  shouldInvalidateSessionsOnSsoEnable,
  type SecuritySettings,
} from '../../../lib/security/settings.js';

export type GetSecuritySettingsFn = (uid: string) => Promise<SecuritySettings>;
export type SaveSecuritySettingsFn = (
  uid: string,
  settings: SecuritySettings,
) => Promise<SecuritySettings>;
export type InvalidateOrgSessionsFn = (uid: string) => Promise<void>;

export interface SecuritySettingsGetDeps {
  requireAuth?: RequireAuthFn;
  getSettings?: GetSecuritySettingsFn;
}

export interface SecuritySettingsPutDeps {
  requireAuth?: RequireAuthFn;
  getSettings?: GetSecuritySettingsFn;
  saveSettings?: SaveSecuritySettingsFn;
  invalidateOrgSessions?: InvalidateOrgSessionsFn;
}

/**
 * GET /api/security/settings
 */
export async function handleSecuritySettingsGet(
  deps: SecuritySettingsGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const settings = deps.getSettings
    ? await deps.getSettings(auth.uid)
    : DEFAULT_SECURITY_SETTINGS;

  return jsonResponse(200, settings);
}

/**
 * PUT /api/security/settings
 */
export async function handleSecuritySettingsPut(
  body: Record<string, unknown>,
  deps: SecuritySettingsPutDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const previous = deps.getSettings
    ? await deps.getSettings(auth.uid)
    : DEFAULT_SECURITY_SETTINGS;

  const updateData = buildSecuritySettingsUpdate(body);

  if (
    shouldInvalidateSessionsOnSsoEnable(previous, updateData) &&
    deps.invalidateOrgSessions
  ) {
    await deps.invalidateOrgSessions(auth.uid);
  }

  const saved = deps.saveSettings
    ? await deps.saveSettings(auth.uid, updateData)
    : updateData;

  return jsonResponse(200, { success: true, security: saved });
}
