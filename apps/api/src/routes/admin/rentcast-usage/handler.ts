import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  isAdminAuthFailure,
  type RequireAdminFn,
} from '../../../lib/auth/admin-types.js';

export interface RentcastUsageQuery {
  year?: number;
  month?: number;
}

export type CountRentcastCallsFn = (year: number, month: number) => Promise<number>;

export interface AdminRentcastUsageGetDeps {
  requireAdmin?: RequireAdminFn;
  countCalls?: CountRentcastCallsFn;
  limit?: number;
  now?: () => Date;
}

/**
 * GET /api/admin/rentcast-usage — migrated from PaperWorking src/app/api/admin/rentcast-usage/route.ts
 */
export async function handleAdminRentcastUsageGet(
  query: RentcastUsageQuery = {},
  deps: AdminRentcastUsageGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAdmin) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  const auth = await deps.requireAdmin();
  if (isAdminAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const now = deps.now?.() ?? new Date();
  const year = query.year ?? now.getFullYear();
  const month = query.month ?? now.getMonth() + 1;

  try {
    const count = deps.countCalls ? await deps.countCalls(year, month) : 0;

    return jsonResponse(200, {
      success: true,
      year,
      month,
      count,
      limit: deps.limit ?? 500,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Admin Usage API] Failed to fetch RentCast call logs', message);
    return jsonResponse(500, { error: 'Failed to retrieve API usage stats.' });
  }
}
