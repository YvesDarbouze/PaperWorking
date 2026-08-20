import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  RESET_PASSWORD_SUCCESS_MESSAGE,
  validateResetPasswordEmail,
} from '../../../lib/auth/password.js';

export interface PasswordResetEmailParams {
  email: string;
  appUrl: string;
}

export type SendPasswordResetEmailFn = (params: PasswordResetEmailParams) => Promise<void>;

export interface AuthResetPasswordPostDeps {
  sendPasswordReset?: SendPasswordResetEmailFn;
  appUrl?: string;
}

export interface AuthResetPasswordBody {
  email?: unknown;
}

/**
 * POST /api/auth/reset-password — public, silent enumeration protection (F-20).
 */
export async function handleAuthResetPasswordPost(
  body: AuthResetPasswordBody,
  deps: AuthResetPasswordPostDeps = {},
): Promise<RouteResult> {
  try {
    const validated = validateResetPasswordEmail(body.email);
    if (!validated.ok) {
      return jsonResponse(400, { error: validated.error });
    }

    if (deps.sendPasswordReset) {
      try {
        await deps.sendPasswordReset({
          email: validated.email,
          appUrl: deps.appUrl ?? 'https://paperworking.co',
        });
      } catch (authError: unknown) {
        const code = (authError as { code?: string })?.code;
        if (code !== 'auth/user-not-found') {
          console.error('[ResetPassword] Non-fatal adminAuth error:', authError);
        }
      }
    }

    return jsonResponse(200, {
      success: true,
      message: RESET_PASSWORD_SUCCESS_MESSAGE,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[ResetPassword] Error:', message);
    return jsonResponse(500, { error: 'Internal server error.' });
  }
}
