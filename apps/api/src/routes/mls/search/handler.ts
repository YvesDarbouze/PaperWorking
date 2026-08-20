import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import { buildMlsSearchFilter, mapMlsPropertyResults, validateMlsSearchQuery } from '../../../lib/mls/search.js';

export type CheckMlsPausedFn = () => Promise<boolean>;
export type SearchMlsPropertiesFn = (filter: string) => Promise<Array<Record<string, unknown>>>;

/**
 * GET /api/mls/search?q=
 */
export async function handleMlsSearchGet(
  query: { q?: string | null },
  deps: {
    requireAuth?: RequireAuthFn;
    isPaused?: CheckMlsPausedFn;
    search?: SearchMlsPropertiesFn;
  } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const validated = validateMlsSearchQuery(query.q);
  if (!validated.ok) return jsonResponse(validated.status, validated.body);

  try {
    if (deps.isPaused && (await deps.isPaused())) {
      return jsonResponse(503, { error: 'MLS service is temporarily unavailable.' });
    }
    const filter = buildMlsSearchFilter(validated.q);
    const raw = deps.search ? await deps.search(filter) : [];
    return jsonResponse(200, mapMlsPropertyResults(raw));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[MLS SEARCH]', message);
    return jsonResponse(500, { error: 'Property search failed. Please try again.' });
  }
}
