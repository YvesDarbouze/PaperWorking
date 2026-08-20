import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  generateMockLinkToken,
  shouldUseMockPlaid,
  type CreateLinkTokenInput,
  type CreateLinkTokenResult,
} from '../../../lib/plaid/link-token.js';

export type CreatePlaidLinkTokenFn = (
  input: CreateLinkTokenInput,
) => Promise<CreateLinkTokenResult>;

export interface PlaidCreateLinkTokenPostDeps {
  requireAuth?: RequireAuthFn;
  createLinkToken?: CreatePlaidLinkTokenFn;
  bankingProvider?: string;
  generateMockToken?: () => string;
}

export interface PlaidCreateLinkTokenBody {
  projectId?: unknown;
  connectionPurpose?: unknown;
  connectionId?: unknown;
  products?: unknown;
  additionalConsentedProducts?: unknown;
}

function parseStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((v): v is string => typeof v === 'string');
}

/**
 * POST /api/plaid/create-link-token — Plaid Link token for new/update mode.
 */
export async function handlePlaidCreateLinkTokenPost(
  body: PlaidCreateLinkTokenBody,
  deps: PlaidCreateLinkTokenPostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  if (shouldUseMockPlaid(deps.bankingProvider)) {
    const mockToken = deps.generateMockToken?.() ?? generateMockLinkToken();
    return jsonResponse(200, { success: true, link_token: mockToken, mock: true });
  }

  if (!deps.createLinkToken) {
    return jsonResponse(500, { success: false, error: 'Plaid link token provider not configured' });
  }

  try {
    const result = await deps.createLinkToken({
      uid: auth.uid,
      projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
      connectionPurpose:
        typeof body.connectionPurpose === 'string' ? body.connectionPurpose : undefined,
      connectionId: typeof body.connectionId === 'string' ? body.connectionId : undefined,
      products: parseStringArray(body.products),
      additionalConsentedProducts: parseStringArray(body.additionalConsentedProducts),
    });

    return jsonResponse(200, { success: true, link_token: result.link_token, mock: result.mock });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create link token';
    const plaidMessage = (error as { plaidErrorMessage?: string })?.plaidErrorMessage;
    console.error('[create-link-token] Failed:', message);
    return jsonResponse(500, { success: false, error: plaidMessage ?? message });
  }
}
