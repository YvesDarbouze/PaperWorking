import type { RouteResult } from '../../../http/response.js';
import {
  handlePlaidExchangePost,
  type PlaidExchangePostDeps,
} from '../exchange/handler.js';

/**
 * POST /api/plaid/exchange-public-token — alias for exchange-v2.
 */
export async function handlePlaidExchangePublicTokenPost(
  body: Record<string, unknown>,
  deps: PlaidExchangePostDeps = {},
): Promise<RouteResult> {
  return handlePlaidExchangePost(body, deps);
}
