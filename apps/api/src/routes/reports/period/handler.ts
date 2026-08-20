import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  computePeriodStart,
  computeReportTotals,
  paginateReportTransactions,
  validateReportsPeriod,
} from '../../../lib/reports/period.js';

export type VerifyOrgAccessFn = (uid: string, orgId: string) => Promise<boolean>;
export type LoadPeriodTransactionsFn = (input: {
  organizationId: string;
  startDate: Date;
  endDate: Date;
}) => Promise<Array<Record<string, unknown>>>;

/**
 * GET /api/reports/[period]
 */
export async function handleReportsPeriodGet(
  period: string,
  query: { organizationId?: string | null; page?: string | null; limit?: string | null },
  deps: {
    requireAuth?: RequireAuthFn;
    verifyOrgAccess?: VerifyOrgAccessFn;
    loadTransactions?: LoadPeriodTransactionsFn;
  } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const orgId = query.organizationId?.trim();
  if (!orgId) return jsonResponse(400, { error: 'Organization ID required' });

  const periodValidated = validateReportsPeriod(period);
  if (!periodValidated.ok) return jsonResponse(periodValidated.status, { error: periodValidated.error });

  const hasAccess = deps.verifyOrgAccess ? await deps.verifyOrgAccess(auth.uid, orgId) : true;
  if (!hasAccess) return jsonResponse(403, { error: 'Forbidden' });

  const now = new Date();
  const startDate = computePeriodStart(periodValidated.period, now);
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(500, Math.max(1, parseInt(query.limit || '100', 10)));

  try {
    const allTransactions = deps.loadTransactions
      ? await deps.loadTransactions({ organizationId: orgId, startDate, endDate: now })
      : [];
    const totals = computeReportTotals(allTransactions as Array<{ amount: number }>);
    const paged = paginateReportTransactions(allTransactions, page, limit);

    return jsonResponse(200, {
      period: periodValidated.period,
      periodStart: startDate.toISOString(),
      periodEnd: now.toISOString(),
      totals,
      transactions: paged.transactions,
      count: paged.count,
      page,
      pages: paged.pages,
      timestamp: now.toISOString(),
    });
  } catch (err: unknown) {
    console.error('[reports]', err);
    return jsonResponse(500, { error: 'Internal Server Error' });
  }
}
