import { jsonResponse, type RouteResult } from '../../../http/response.js';

export type LoadE2EFollowsFn = () => Promise<{ follows: unknown; consents: unknown }>;
export type ClearE2EFollowsFn = () => Promise<void>;

function isProduction(nodeEnv?: string): boolean {
  return nodeEnv === 'production';
}

/**
 * GET /api/e2e/follows
 */
export async function handleE2eFollowsGet(
  deps: { nodeEnv?: string; load?: LoadE2EFollowsFn } = {},
): Promise<RouteResult> {
  if (isProduction(deps.nodeEnv ?? process.env.NODE_ENV)) {
    return jsonResponse(404, { error: 'Not Found' });
  }
  const data = deps.load ? await deps.load() : { follows: [], consents: [] };
  return jsonResponse(200, data);
}

/**
 * POST /api/e2e/follows
 */
export async function handleE2eFollowsPost(
  deps: { nodeEnv?: string; clear?: ClearE2EFollowsFn } = {},
): Promise<RouteResult> {
  if (isProduction(deps.nodeEnv ?? process.env.NODE_ENV)) {
    return jsonResponse(404, { error: 'Not Found' });
  }
  if (deps.clear) await deps.clear();
  return jsonResponse(200, { success: true });
}
