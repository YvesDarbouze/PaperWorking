import { jsonResponse, type RouteResult } from '../../http/response.js';
import type { RequireAuthFn } from '../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../lib/auth/auth-types.js';
import { buildZipDemographics, validateMarketVitalsZip } from '../../lib/market-vitals/census.js';

export type FetchAcsYearFn = (year: number, zip: string) => Promise<Record<string, number> | null>;

/**
 * GET /api/market-vitals?zip=XXXXX
 */
export async function handleMarketVitalsGet(
  query: { zip?: string | null },
  deps: {
    requireAuth?: RequireAuthFn;
    acsYears?: number[];
    fetchAcsYear?: FetchAcsYearFn;
  } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const validated = validateMarketVitalsZip(query.zip);
  if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

  const years = deps.acsYears ?? [2023, 2022, 2021];
  const yearlyData = new Map<number, Record<string, number>>();
  for (const year of years) {
    const data = deps.fetchAcsYear ? await deps.fetchAcsYear(year, validated.zip) : null;
    if (data) yearlyData.set(year, data);
  }

  if (yearlyData.size === 0) {
    return jsonResponse(404, {
      error: `No Census ACS data found for ZIP ${validated.zip}. Verify the ZCTA exists.`,
    });
  }

  return jsonResponse(200, {
    demographics: buildZipDemographics({ zip: validated.zip, yearlyData }),
  });
}
