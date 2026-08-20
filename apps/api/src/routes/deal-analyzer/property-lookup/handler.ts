import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  isE2ETestContext,
  validatePropertyLookupBody,
} from '../../../lib/deal-analyzer/property-lookup.js';

export type LookupPropertyDataFn = (
  address: string,
  isE2E: boolean,
) => Promise<Record<string, unknown>>;

export interface DealAnalyzerPropertyLookupPostDeps {
  lookupProperty?: LookupPropertyDataFn;
}

/**
 * POST /api/deal-analyzer/property-lookup
 */
export async function handleDealAnalyzerPropertyLookupPost(
  body: { address?: unknown },
  context: { cookie?: string | null; e2eHeader?: string | null } = {},
  deps: DealAnalyzerPropertyLookupPostDeps = {},
): Promise<RouteResult> {
  const validated = validatePropertyLookupBody(body);
  if (!validated.ok) {
    return jsonResponse(validated.status, { success: false, error: validated.error });
  }

  try {
    const isE2E = isE2ETestContext(context);
    const data = deps.lookupProperty
      ? await deps.lookupProperty(validated.address, isE2E)
      : { address: validated.address, provider: 'mock' };

    return jsonResponse(200, { success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/deal-analyzer/property-lookup] Error:', message);
    return jsonResponse(500, {
      success: false,
      error: message || "We couldn't find data for this address — enter values manually.",
    });
  }
}
