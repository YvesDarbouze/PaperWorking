import { jsonResponse, type RouteResult } from '../../http/response.js';
import type { RequireAuthFn } from '../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../lib/auth/auth-types.js';
import { validatePermitLookupQuery } from '../../lib/permits/lookup.js';

export type LookupPermitFn = (input: {
  propertyAddress: string;
  jurisdictionId: string;
  permitNumber?: string;
}) => Promise<Record<string, unknown>>;

/**
 * GET /api/permits
 */
export async function handlePermitsGet(
  query: { propertyAddress?: string | null; jurisdictionId?: string | null; permitNumber?: string | null },
  deps: { requireAuth?: RequireAuthFn; lookupPermit?: LookupPermitFn } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const validated = validatePermitLookupQuery(query);
  if (!validated.ok) {
    return jsonResponse(400, { success: false, error: validated.error });
  }

  try {
    const permit = deps.lookupPermit ? await deps.lookupPermit(validated.data) : { status: 'UNKNOWN' };
    return jsonResponse(200, { success: true, permit });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string }).code;
    if (code === 'JURISDICTION_NOT_SUPPORTED') {
      return jsonResponse(422, { success: false, error: message, code });
    }
    if (code === 'UPSTREAM_ERROR') {
      return jsonResponse(502, {
        success: false,
        error: message,
        code,
        upstreamStatus: (err as { upstreamStatus?: number }).upstreamStatus,
      });
    }
    console.error('[/api/permits]', err);
    return jsonResponse(500, { success: false, error: 'Internal server error' });
  }
}
