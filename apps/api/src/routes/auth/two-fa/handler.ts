import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  TWO_FA_QR_SVG,
  buildOtpAuthUrl,
  generateBackupCodes,
  generateTwoFaSecret,
  isValidMockTotpCode,
  parseTwoFaAction,
} from '../../../lib/auth/two-fa.js';

export type GetUserEmailFn = (uid: string) => Promise<string | null>;
export type VerifyPasswordFn = (
  email: string,
  password: string,
) => Promise<{ ok: true } | { ok: false; error: string }>;
export type SaveTwoFaSettingsFn = (
  uid: string,
  settings: { secret: string; backupCodes: string[] },
) => Promise<void>;
export type ClearTwoFaSettingsFn = (uid: string) => Promise<void>;

export interface AuthTwoFaPostDeps {
  requireAuth?: RequireAuthFn;
  getUserEmail?: GetUserEmailFn;
  verifyPassword?: VerifyPasswordFn;
  saveTwoFaSettings?: SaveTwoFaSettingsFn;
  clearTwoFaSettings?: ClearTwoFaSettingsFn;
  generateBackupCodes?: () => string[];
}

export interface AuthTwoFaPostBody {
  password?: unknown;
  code?: unknown;
  secret?: unknown;
}

/**
 * POST /api/auth/2fa/[action] — setup, verify, or disable 2FA.
 */
export async function handleAuthTwoFaPost(
  action: string | undefined,
  body: AuthTwoFaPostBody,
  deps: AuthTwoFaPostDeps = {},
): Promise<RouteResult> {
  const parsedAction = parseTwoFaAction(action);
  if (!parsedAction) {
    return jsonResponse(404, { error: 'Endpoint not found' });
  }

  if (!deps.requireAuth) {
    return jsonResponse(500, { error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const email = deps.getUserEmail ? await deps.getUserEmail(auth.uid) : '';

  if (parsedAction === 'setup') {
    const password = body.password;
    if (!password || typeof password !== 'string') {
      return jsonResponse(400, { error: 'Password is required to setup 2FA.' });
    }

    if (email && deps.verifyPassword) {
      try {
        const verifyResult = await deps.verifyPassword(email, password);
        if (!verifyResult.ok) {
          return jsonResponse(401, { error: 'Incorrect password.' });
        }
      } catch {
        return jsonResponse(500, { error: 'Verification failed.' });
      }
    }

    const secret = generateTwoFaSecret();
    const otpauthUrl = buildOtpAuthUrl(email || 'user@example.com', secret);

    return jsonResponse(200, {
      secret,
      qrSvg: TWO_FA_QR_SVG,
      otpauthUrl,
    });
  }

  if (parsedAction === 'verify') {
    const { code, secret } = body;
    if (!code || typeof code !== 'string' || !secret || typeof secret !== 'string') {
      return jsonResponse(400, { error: 'Verification code and secret are required.' });
    }

    if (!isValidMockTotpCode(code)) {
      return jsonResponse(400, {
        error: 'Invalid verification code. Enter 123456 to verify.',
      });
    }

    const backupCodes = deps.generateBackupCodes?.() ?? generateBackupCodes();
    if (deps.saveTwoFaSettings) {
      await deps.saveTwoFaSettings(auth.uid, { secret, backupCodes });
    }

    return jsonResponse(200, { success: true, backupCodes });
  }

  if (parsedAction === 'disable') {
    const { password, code } = body;
    if (!password || typeof password !== 'string' || !code || typeof code !== 'string') {
      return jsonResponse(400, { error: 'Password and verification code are required.' });
    }

    if (email && deps.verifyPassword) {
      try {
        const verifyResult = await deps.verifyPassword(email, password);
        if (!verifyResult.ok) {
          return jsonResponse(401, { error: 'Incorrect password.' });
        }
      } catch {
        return jsonResponse(500, { error: 'Verification failed.' });
      }
    }

    if (!isValidMockTotpCode(code)) {
      return jsonResponse(400, {
        error: 'Invalid verification code. Enter 123456 to verify.',
      });
    }

    if (deps.clearTwoFaSettings) {
      await deps.clearTwoFaSettings(auth.uid);
    }

    return jsonResponse(200, { success: true });
  }

  return jsonResponse(404, { error: 'Endpoint not found' });
}
