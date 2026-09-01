import type { AuthUser } from '@paperworking/authz';
import { hasActiveEntitlement } from '../../../payments/entitlement.js';
import { jsonResponse, type RouteResult } from '../../../http/response.js';

export interface AuthMeUserRow {
  id: string;
  email?: string | null;
  displayName?: string | null;
  name?: string | null;
  legacyFirebaseUid?: string | null;
}

export interface AuthMeSubscriptionRow {
  plan?: string | null;
  status?: string | null;
  stripeSubscriptionId?: string | null;
}

/** Exact Nest GET /api/auth/me response body (AuthService.getMe). */
export interface AuthMeResponse {
  authenticated: true;
  uid: string;
  email?: string | null;
  displayName?: string | null;
  accountType: string;
  isAdmin: boolean;
  subscriptionPlan: string;
  subscriptionStatus: string;
  hasActiveSubscription: boolean;
}

export interface AuthMeDeps {
  findUser?: (uid: string) => Promise<AuthMeUserRow | null>;
  findSubscription?: (userId: string) => Promise<AuthMeSubscriptionRow | null>;
  hasActiveEntitlement?: typeof hasActiveEntitlement;
}

export async function buildAuthMeResponse(
  user: AuthUser,
  deps: AuthMeDeps = {},
): Promise<AuthMeResponse> {
  const row = deps.findUser ? await deps.findUser(user.uid) : null;
  const sub = deps.findSubscription
    ? await deps.findSubscription(row?.id || user.uid)
    : null;
  const checkEntitlement = deps.hasActiveEntitlement ?? hasActiveEntitlement;

  return {
    authenticated: true,
    uid: user.uid,
    email: row?.email || user.email,
    displayName: row?.displayName || row?.name,
    accountType: user.accountType,
    isAdmin: user.isAdmin,
    subscriptionPlan: sub?.plan || 'Individual',
    subscriptionStatus: sub?.status || 'active',
    hasActiveSubscription: checkEntitlement(sub),
  };
}

/**
 * GET /api/auth/me — shared handler for Nest parity and Next.js adapter.
 * Caller must resolve AuthUser via @paperworking/services session resolver.
 */
export async function handleAuthMeGet(
  user: AuthUser | null,
  deps: AuthMeDeps = {},
): Promise<RouteResult> {
  if (!user) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  const body = await buildAuthMeResponse(user, deps);
  return jsonResponse(200, body);
}
