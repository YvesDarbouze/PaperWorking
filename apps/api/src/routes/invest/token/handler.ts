import { jsonResponse, type RouteResult } from '../../../http/response.js';
import { LEGACY_INVEST_RESPONSE } from '../../../lib/invest/legacy.js';

/**
 * GET /api/invest/[token] — retired legacy route (410).
 */
export async function handleInvestTokenGet(): Promise<RouteResult> {
  return jsonResponse(410, LEGACY_INVEST_RESPONSE);
}

/**
 * POST /api/invest/[token] — retired legacy route (410).
 */
export async function handleInvestTokenPost(): Promise<RouteResult> {
  return jsonResponse(410, LEGACY_INVEST_RESPONSE);
}
