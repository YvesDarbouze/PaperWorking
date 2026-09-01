import {
  verifyAccessToken,
  type IdentityVerificationDeps,
} from '@paperworking/identity';
import { normalizeClientAccountType } from '../session/account-type.js';
import {
  buildClearSessionCookieDescriptors,
  buildSessionCookieDescriptors,
  NEXT_SESSION_MAX_AGE_SEC,
} from './cookie-policy.js';
import type { IdentityProvisioningService } from './types.js';
import type {
  CookieDescriptor,
  EstablishSessionResult,
  SessionCookiePolicyKind,
  SubscriptionLookup,
} from './types.js';

export type EstablishSessionInput = {
  accessToken?: string;
  accountType?: unknown;
  identity: IdentityVerificationDeps;
  identityProvisioning: IdentityProvisioningService;
  subscriptionLookup: SubscriptionLookup;
  policy: SessionCookiePolicyKind;
  nodeEnv?: string;
  cookieSameSite?: string;
  /** Optional Firebase session-cookie transform (Next route only). */
  sessionValueTransform?: (accessToken: string, maxAgeMs: number) => Promise<string>;
  sessionId?: string;
};

function hasIdentityCredentials(identity: IdentityVerificationDeps): boolean {
  return (
    Boolean(identity.supabase?.hasCredentials()) ||
    Boolean(identity.firebase?.hasCredentials())
  );
}

/**
 * Framework-independent session establishment — verify token, provision user,
 * resolve AuthUser from Neon, return cookie descriptors for HTTP adapters.
 */
export class SessionCommandService {
  async establishSession(input: EstablishSessionInput): Promise<EstablishSessionResult> {
    const accessToken = input.accessToken?.trim();
    if (!accessToken) {
      return { ok: false, status: 400, body: { error: 'accessToken required' } };
    }

    if (!hasIdentityCredentials(input.identity) || accessToken.startsWith('mock')) {
      return {
        ok: false,
        status: 503,
        body: { error: 'Identity provider credentials not configured' },
      };
    }

    try {
      const verified = await verifyAccessToken(accessToken, input.identity);
      const accountType = normalizeClientAccountType(input.accountType);
      const authUser = await input.identityProvisioning.provisionFromVerifiedIdentity(
        verified,
        accountType,
      );

      let sessionValue = accessToken;
      if (input.sessionValueTransform) {
        try {
          sessionValue = await input.sessionValueTransform(
            accessToken,
            NEXT_SESSION_MAX_AGE_SEC * 1000,
          );
        } catch {
          sessionValue = accessToken;
        }
      }

      const subscription = await input.subscriptionLookup.findForUserId(authUser.uid);
      const cookies = buildSessionCookieDescriptors({
        policy: input.policy,
        sessionValue,
        authUserAccountType:
          authUser.accountType === 'admin' ? 'admin' : authUser.accountType,
        subscription,
        nodeEnv: input.nodeEnv,
        cookieSameSite: input.cookieSameSite,
        sessionId: input.sessionId,
      });

      return {
        ok: true,
        authUser,
        uid: authUser.uid,
        cookies,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('email is required')) {
        return { ok: false, status: 401, body: { error: 'Invalid access token' } };
      }
      return { ok: false, status: 401, body: { error: 'Invalid access token' } };
    }
  }

  buildClearSessionCookies(input: {
    policy: SessionCookiePolicyKind;
    nodeEnv?: string;
    cookieSameSite?: string;
  }): CookieDescriptor[] {
    return buildClearSessionCookieDescriptors(input);
  }
}

export const sessionCommandService = new SessionCommandService();
