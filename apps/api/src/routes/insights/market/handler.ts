import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  buildMarketCacheKey,
  buildMarketStatsSeries,
  buildProjectMarketSeries,
  extractProjectZipCode,
  generateLastNQuarters,
  parseMarketQuery,
  type MarketStatsHistory,
  type MetricSnapshotRow,
} from '../../../lib/insights/market.js';

export type VerifyIdTokenFn = (
  idToken: string,
) => Promise<{ uid: string; organizationId?: string }>;

export type LoadMarketOverlayDataFn = (input: {
  orgId: string;
  projectId: string;
  metric: string;
}) => Promise<{
  project: { organizationId?: string; zip?: string; zipCode?: string; address?: string };
  snapshots: MetricSnapshotRow[];
  marketStats: MarketStatsHistory | null;
} | null>;

export interface InsightsMarketGetDeps {
  verifyIdToken?: VerifyIdTokenFn;
  loadMarketData?: LoadMarketOverlayDataFn;
  getCached?: (key: string) => unknown | null;
  setCached?: (key: string, data: unknown, ttlMs: number) => void;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * GET /api/insights/market
 */
export async function handleInsightsMarketGet(
  query: { projectId?: string | null; metric?: string },
  idToken: string | null | undefined,
  deps: InsightsMarketGetDeps = {},
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
     console.error('[Insights Market API] Token verification failed:', error);
    return jsonResponse(401, { success: false, error: 'Unauthorized' });
  }

  const parsed = parseMarketQuery(query);
  if (!parsed.ok) {
    return jsonResponse(parsed.status, { success: false, error: parsed.error });
  }

  const { projectId, metric } = parsed;
  const cacheKey = buildMarketCacheKey(projectId, metric);
  const cached = deps.getCached?.(cacheKey);
  if (cached) {
    return jsonResponse(200, cached);
  }

  try {
    const loaded = deps.loadMarketData
      ? await deps.loadMarketData({ orgId, projectId, metric })
      : {
          project: { organizationId: orgId, zip: '90210' },
          snapshots: [],
          marketStats: null,
        };

    if (!loaded) {
      return jsonResponse(404, { success: false, error: 'Project not found' });
    }

    if (loaded.project.organizationId !== orgId) {
      return jsonResponse(403, { success: false, error: 'Forbidden' });
    }

    const zipCode = extractProjectZipCode(loaded.project);
    if (!zipCode) {
      return jsonResponse(400, {
        success: false,
        error: 'Project does not have a valid ZIP code',
      });
    }

    const quarters = generateLastNQuarters(8);
    const projectSeries = buildProjectMarketSeries(quarters, loaded.snapshots, metric);
    const marketSeries = buildMarketStatsSeries(quarters, loaded.marketStats, metric);

    const resPayload = { quarters, projectSeries, marketSeries };
    deps.setCached?.(cacheKey, resPayload, CACHE_TTL_MS);
    return jsonResponse(200, resPayload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Market Overlay API] Failure:', message);
    return jsonResponse(500, { success: false, error: message || 'Internal Server Error' });
  }
}
