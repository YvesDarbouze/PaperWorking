import { jsonResponse, type RouteResult } from '../../http/response.js';
import type { RequireAuthFn } from '../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../lib/auth/auth-types.js';
import { LAWYER_MAX_RESULTS, mergeLawyerQueryResults, validateLawyerStateQuery } from '../../lib/lawyers/query.js';

export type QueryLawyersFn = (state: string, limit: number) => Promise<Array<Record<string, unknown>>>;

/**
 * GET /api/lawyers?state=XX
 */
export async function handleLawyersGet(
  query: { state?: string | null },
  deps: { requireAuth?: RequireAuthFn; queryLawyers?: QueryLawyersFn } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(401, { error: 'Unauthorized' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const validated = validateLawyerStateQuery(query.state);
  if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

  try {
    const lawyers = deps.queryLawyers
      ? await deps.queryLawyers(validated.state, LAWYER_MAX_RESULTS)
      : mergeLawyerQueryResults([], []);
    return jsonResponse(200, { success: true, lawyers, count: lawyers.length });
  } catch (err: unknown) {
    console.error('Lawyer query failed:', err);
    return jsonResponse(500, { error: 'Failed to query lawyers' });
  }
}
