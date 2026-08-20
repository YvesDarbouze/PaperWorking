import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import { validatePasswordChangeInput } from '../../../lib/auth/password.js';

export type GetUserEmailFn = (uid: string) => Promise<string | null>;
export type VerifyPasswordFn = (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
export type UpdateUserPasswordFn = (uid: string, newPassword: string) => Promise<void>;

export interface AuthChangePasswordPostDeps {
  requireAuth?: RequireAuthFn;
  getUserEmail?: GetUserEmailFn;
  verifyPassword?: VerifyPasswordFn;
  updatePassword?: UpdateUserPasswordFn;
}

export interface AuthChangePasswordBody {
  currentPassword?: unknown;
  newPassword?: unknown;
}

/**
 * POST /api/auth/change-password — authenticated password change.
 */
export async function handleAuthChangePasswordPost(
  body: AuthChangePasswordBody,
  deps: AuthChangePasswordPostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const validated = validatePasswordChangeInput(body);
  if (!validated.ok) {
    return jsonResponse(400, { error: validated.error });
  }

  const currentPassword = body.currentPassword as string;
  const newPassword = body.newPassword as string;

  let email: string | null = null;
  if (deps.getUserEmail) {
    try {
      email = await deps.getUserEmail(auth.uid);
    } catch {
      return jsonResponse(500, { error: 'Failed to retrieve user information.' });
    }
  }

  if (!email) {
    return jsonResponse(400, { error: 'User does not have an email address associated.' });
  }

  if (deps.verifyPassword) {
    try {
      const verifyResult = await deps.verifyPassword(email, currentPassword);
      if (!verifyResult.ok) {
        return jsonResponse(401, { error: verifyResult.error });
      }
    } catch {
      return jsonResponse(500, { error: 'Verification failed. Please try again.' });
    }
  }

  if (deps.updatePassword) {
    try {
      await deps.updatePassword(auth.uid, newPassword);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password.';
      return jsonResponse(550, { error: message });
    }
  }

  return jsonResponse(200, { success: true });
}
