import { binaryResponse, jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import { buildSampleTaxDatapoints, parseTaxPackageRequest } from '../../../lib/tax/schema.js';

export type Generate1040EsPdfFn = (input: {
  datapoints: Record<string, unknown>;
  taxYear: number;
}) => Promise<{ pdfBuffer: Uint8Array; fileName: string }>;

export interface Tax1040EsPostDeps {
  requireAuth?: RequireAuthFn;
  generate1040Es?: Generate1040EsPdfFn;
}

/**
 * POST /api/tax/1040-es
 */
export async function handleTax1040EsPost(
  body: { projectId?: unknown; taxYear?: unknown },
  deps: Tax1040EsPostDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { error: 'Auth not configured' });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    const { projectId, taxYear } = parseTaxPackageRequest(body);
    const taxYearResolved = typeof body.taxYear === 'number' ? body.taxYear : 2026;
    const datapoints = buildSampleTaxDatapoints(projectId, taxYearResolved);

    const docResult = deps.generate1040Es
      ? await deps.generate1040Es({ datapoints, taxYear: taxYearResolved })
      : {
          pdfBuffer: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
          fileName: `1040-ES_${taxYearResolved}.pdf`,
        };

    return binaryResponse(200, docResult.pdfBuffer, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${docResult.fileName}"`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse(500, { error: 'Failed to generate 1040-ES document', details: message });
  }
}
