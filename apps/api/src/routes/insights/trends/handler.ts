import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  buildOccupancyTrendSeries,
  buildTransactionTrendSeries,
  buildTrendsCacheKey,
  generateLastNMonths,
  parseTrendsQuery,
  type OccupancySnapshot,
  type TrendTransaction,
} from '../../../lib/insights/trends.js';

export type VerifyIdTokenFn = (
  idToken: string,
) => Promise<{ uid: string; organizationId?: string }>;

export type LoadTrendsDataFn = (input: {
  orgId: string;
  projectId: string | null;
  metric: string;
}) => Promise<{
  occupancySnapshots?: OccupancySnapshot[];
  transactions?: TrendTransaction[];
}>;

export interface InsightsTrendsGetDeps {
  verifyIdToken?: VerifyIdTokenFn;
  loadTrendsData?: LoadTrendsDataFn;
  getCached?: (key: string) => unknown | null;
  setCached?: (key: string, data: unknown, ttlMs: number) => void;
}

const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * GET /api/insights/trends
 */
export async function handleInsightsTrendsGet(
  query: { metric?: string; projectId?: string | null },
  idToken: string | null | undefined,
  deps: InsightsTrendsGetDeps = {},
): Promise<RouteResult> {
  if (!idToken) {
    return jsonResponse(401, { success: false, error: 'Unauthorized' });
  }

  let orgId = 'org_paperworking_seed';
  try {
    const decoded = deps.verifyIdToken
      ? await deps.verifyIdToken(idToken)
      : { uid: 'user-demo', organizationId: orgId };
    orgId = decoded.organizationId || orgId;
  } catch (error: unknown) {
    console.error('[Insights Trends API] Token verification failed:', error);
    return jsonResponse(401, { success: false, error: 'Unauthorized' });
  }

  const parsed = parseTrendsQuery(query);
  const cacheKey = buildTrendsCacheKey(orgId, parsed.projectId, parsed.metric);
  const cached = deps.getCached?.(cacheKey);
  if (cached) {
    return jsonResponse(200, cached);
  }

  try {
    const months = generateLastNMonths(24);
    const data = deps.loadTrendsData
      ? await deps.loadTrendsData({
          orgId,
          projectId: parsed.projectId,
          metric: parsed.metric,
        })
      : { occupancySnapshots: [], transactions: [] };

    let finalData: Array<{ date: string; value: number }>;
    if (parsed.metric === 'occupancy') {
      finalData = buildOccupancyTrendSeries(
        months,
        data.occupancySnapshots ?? [],
        parsed.projectId,
      );
    } else {
      finalData = buildTransactionTrendSeries(
        months,
        data.transactions ?? [],
        parsed.metric,
      );
    }

    deps.setCached?.(cacheKey, finalData, CACHE_TTL_MS);
    return jsonResponse(200, finalData);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Trends API] Failure:', message);
    return jsonResponse(500, { success: false, error: message || 'Internal Server Error' });
  }
}
