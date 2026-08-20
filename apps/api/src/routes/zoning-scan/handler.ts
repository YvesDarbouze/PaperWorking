import { jsonResponse, type RouteResult } from '../../http/response.js';
import type { RequireAuthFn } from '../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../lib/auth/auth-types.js';
import {
  buildZoningScanResult,
  extractRECs,
  validateZoningScanBody,
} from '../../lib/zoning/scan.js';

export type LookupZoningDataFn = (input: {
  address: string;
  zip: string;
}) => Promise<{
  zoningCode?: string | null;
  zoningDescription?: string | null;
  permittedUnitDensity?: number;
  source?: string;
} | null>;

export interface ZoningScanPostDeps {
  requireAuth?: RequireAuthFn;
  lookupZoning?: LookupZoningDataFn;
}

/**
 * POST /api/zoning-scan
 */
export async function handleZoningScanPost(
  body: {
    zip?: unknown;
    address?: unknown;
    projectId?: unknown;
    phaseIReportText?: unknown;
  },
  deps: ZoningScanPostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const validated = validateZoningScanBody(body);
  if (!validated.ok) {
    return jsonResponse(validated.status, { error: validated.error });
  }

  const phaseIReportText =
    typeof body.phaseIReportText === 'string' ? body.phaseIReportText : '';
  const recs = extractRECs(phaseIReportText);

  const zoning = deps.lookupZoning
    ? await deps.lookupZoning({ address: validated.address, zip: validated.zip })
    : null;

  const result = buildZoningScanResult({
    zip: validated.zip,
    recs,
    zoningCode: zoning?.zoningCode,
    zoningDescription: zoning?.zoningDescription,
    permittedUnitDensity: zoning?.permittedUnitDensity,
    source: zoning?.source,
  });

  return jsonResponse(200, { result });
}
