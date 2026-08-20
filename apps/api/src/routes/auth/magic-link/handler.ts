import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  MAGIC_LINK_SUCCESS_MESSAGE,
  validateResetPasswordEmail,
} from '../../../lib/auth/password.js';

export interface MagicLinkEmailParams {
  email: string;
  appUrl: string;
}

export type SendMagicLinkEmailFn = (params: MagicLinkEmailParams) => Promise<void>;

export interface AuthMagicLinkPostDeps {
  sendMagicLink?: SendMagicLinkEmailFn;
  appUrl?: string;
}

export interface AuthMagicLinkBody {
  email?: unknown;
}

/**
 * POST /api/auth/magic-link — public passwordless sign-in link (F-20 silent).
 */
export async function handleAuthMagicLinkPost(
  body: AuthMagicLinkBody,
  deps: AuthMagicLinkPostDeps = {},
): Promise<RouteResult> {
  try {
    const validated = validateResetPasswordEmail(body.email);
    if (!validated.ok) {
      return jsonResponse(400, { error: validated.error });
    }

    if (deps.sendMagicLink) {
      try {
        await deps.sendMagicLink({
          email: validated.email,
          appUrl: deps.appUrl ?? 'https://paperworking.co',
        });
      } catch (authError: unknown) {
        console.error('[MagicLink] Non-fatal adminAuth error:', authError);
      }
    }

    return jsonResponse(200, {
      success: true,
      message: MAGIC_LINK_SUCCESS_MESSAGE,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[MagicLink] Error:', message);
    return jsonResponse(500, { error: 'Internal server error.' });
  }
}
