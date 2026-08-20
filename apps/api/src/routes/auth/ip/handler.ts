import { jsonResponse, type RouteResult } from '../../../http/response.js';
import { extractClientIp } from '../../../lib/auth/ip.js';

export interface AuthIpGetDeps {
  headers?: Record<string, string | undefined>;
}

/**
 * GET /api/auth/ip
 */
export async function handleAuthIpGet(deps: AuthIpGetDeps = {}): Promise<RouteResult> {
  const ip = extractClientIp(deps.headers ?? {});
  return jsonResponse(200, { ip });
}
