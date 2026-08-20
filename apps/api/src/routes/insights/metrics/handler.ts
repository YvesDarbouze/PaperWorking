import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  buildMetricsCacheKey,
  parseMetricsQuery,
  type MetricRegistryEntry,
} from '../../../lib/insights/metrics-display.js';

export type VerifyIdTokenFn = (
  idToken: string,
) => Promise<{ uid: string; organizationId?: string }>;

export type ComputeMetricsPayloadFn = (input: {
  userId: string;
  orgId: string;
  category: string;
  projectId: string | null;
  portfolio: boolean;
  breakdown: boolean;
  registry: MetricRegistryEntry[];
}) => Promise<Record<string, unknown>>;

export type LoadMetricsRegistryFn = () => MetricRegistryEntry[];

export interface InsightsMetricsGetDeps {
  verifyIdToken?: VerifyIdTokenFn;
  loadRegistry?: LoadMetricsRegistryFn;
  computeMetrics?: ComputeMetricsPayloadFn;
  getCached?: (key: string) => unknown | null;
  setCached?: (key: string, data: unknown, ttlMs: number) => void;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * GET /api/insights/metrics
 */
export async function handleInsightsMetricsGet(
  query: {
    category?: string | null;
    projectId?: string | null;
    portfolio?: string | null;
    breakdown?: string | null;
  },
  idToken: string | null | undefined,
  deps: InsightsMetricsGetDeps = {},
): Promise<RouteResult> {
  if (!idToken) {
    return jsonResponse(401, { success: false, error: 'Unauthorized' });
  }

  let userId = 'user-demo';
  let orgId = 'org_paperworking_seed';
  try {
    const decoded = deps.verifyIdToken
      ? await deps.verifyIdToken(idToken)
      : { uid: userId, organizationId: orgId };
    userId = decoded.uid;
    orgId = decoded.organizationId || orgId;
  } catch (error: unknown) {
    console.error('[Insights Metrics API] Token verification failed:', error);
    return jsonResponse(401, { success: false, error: 'Unauthorized' });
  }

  const parsed = parseMetricsQuery(query);
  if (!parsed.ok) {
    return jsonResponse(parsed.status, { success: false, error: parsed.error });
  }

  const cacheKey = buildMetricsCacheKey(orgId, parsed.projectId, parsed.category, parsed.breakdown);
  const cached = deps.getCached?.(cacheKey);
  if (cached) {
    return jsonResponse(200, cached);
  }

  try {
    const registry = deps.loadRegistry ? deps.loadRegistry() : [];
    const payload = deps.computeMetrics
      ? await deps.computeMetrics({
          userId,
          orgId,
          category: parsed.category,
          projectId: parsed.projectId,
          portfolio: parsed.portfolio,
          breakdown: parsed.breakdown,
          registry,
        })
      : { hasLinkedBank: false, metrics: [], projectBreakdowns: undefined };

    deps.setCached?.(cacheKey, payload, CACHE_TTL_MS);
    return jsonResponse(200, payload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Insights Metrics API] Error processing metrics request:', message);
    return jsonResponse(500, { success: false, error: message || 'Internal Server Error' });
  }
}
