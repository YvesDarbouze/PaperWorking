import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  normalizeNotificationPreferences,
  notificationPreferencesSchema,
} from '../../../lib/user/notification-preferences.js';

export type GetNotificationPreferencesFn = (
  userId: string,
) => Promise<Record<string, unknown>>;

export type UpdateNotificationPreferencesFn = (
  userId: string,
  patch: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

export interface NotificationPreferencesGetDeps {
  requireAuth?: RequireAuthFn;
  getPreferences?: GetNotificationPreferencesFn;
}

export interface NotificationPreferencesPutDeps {
  requireAuth?: RequireAuthFn;
  updatePreferences?: UpdateNotificationPreferencesFn;
}

/**
 * GET /api/user/notification-preferences
 */
export async function handleNotificationPreferencesGet(
  deps: NotificationPreferencesGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  try {
    const prefs = deps.getPreferences
      ? await deps.getPreferences(auth.uid)
      : { emailTransactionAlerts: true, emailAlertMinAmount: 0 };

    return jsonResponse(200, {
      success: true,
      preferences: normalizeNotificationPreferences(prefs),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[GET /api/user/notification-preferences] Failed:', message);
    return jsonResponse(500, { success: false, error: message });
  }
}

/**
 * PUT /api/user/notification-preferences
 */
export async function handleNotificationPreferencesPut(
  body: unknown,
  deps: NotificationPreferencesPutDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const parsed = notificationPreferencesSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(422, {
      success: false,
      error: 'Validation failed',
      details: parsed.error.flatten(),
    });
  }

  try {
    const updated = deps.updatePreferences
      ? await deps.updatePreferences(auth.uid, parsed.data)
      : parsed.data;

    return jsonResponse(200, {
      success: true,
      preferences: normalizeNotificationPreferences(updated),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[PUT /api/user/notification-preferences] Failed:', message);
    return jsonResponse(500, { success: false, error: message });
  }
}
