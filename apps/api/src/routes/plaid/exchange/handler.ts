import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  parsePlaidExchangeBody,
  type ParsedPlaidExchangeBody,
  type PlaidExchangeSuccess,
} from '../../../lib/plaid/exchange.js';
import { shouldUseMockPlaid } from '../../../lib/plaid/link-token.js';

export type ExchangePlaidPublicTokenFn = (
  input: ParsedPlaidExchangeBody & { uid: string },
) => Promise<PlaidExchangeSuccess>;

export interface PlaidExchangePostDeps {
  requireAuth?: RequireAuthFn;
  exchangePublicToken?: ExchangePlaidPublicTokenFn;
  bankingProvider?: string;
}

/**
 * POST /api/plaid/exchange-v2 (and alias exchange-public-token)
 */
export async function handlePlaidExchangePost(
  body: Record<string, unknown>,
  deps: PlaidExchangePostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const parsed = parsePlaidExchangeBody(body);
  if (!parsed.ok) {
    return jsonResponse(400, { success: false, error: parsed.error });
  }

  if (!deps.exchangePublicToken) {
    return jsonResponse(500, { success: false, error: 'Plaid exchange not configured' });
  }

  try {
    const result = await deps.exchangePublicToken({
      ...parsed.value,
      uid: auth.uid,
    });

    return jsonResponse(200, {
      success: true,
      itemId: result.itemId,
      plaidConnectionId: result.plaidConnectionId,
      connectionPurpose: result.connectionPurpose,
      institutionName: result.institutionName,
      accountMask: result.accountMask,
      mock: shouldUseMockPlaid(deps.bankingProvider) || undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to exchange Plaid token';
    console.error('[PlaidExchangeV2] Failed:', message);
    return jsonResponse(500, { success: false, error: message });
  }
}
