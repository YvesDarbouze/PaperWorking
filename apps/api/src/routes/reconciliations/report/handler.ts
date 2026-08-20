import { binaryResponse, jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';

export type ReconciliationReportFormat = 'json' | 'html' | 'pdf';

export type GenerateReconciliationReportFn = (
  periodId: string,
  format: ReconciliationReportFormat,
) => Promise<
  | { format: 'json'; report: Record<string, unknown> }
  | { format: 'html'; html: string }
  | { format: 'pdf'; buffer: Uint8Array }
>;

export interface ReconciliationReportGetQuery {
  format?: string | null;
}

export interface ReconciliationReportGetDeps {
  requireAuth?: RequireAuthFn;
  generateReport?: GenerateReconciliationReportFn;
}

function normalizeReportFormat(raw: string | null | undefined): ReconciliationReportFormat {
  const format = (raw || 'json').toLowerCase();
  if (format === 'html' || format === 'pdf') return format;
  return 'json';
}

/**
 * GET /api/reconciliations/[periodId]/report?format=json|html|pdf
 */
export async function handleReconciliationReportGet(
  periodId: string,
  query: ReconciliationReportGetQuery = {},
  deps: ReconciliationReportGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const format = normalizeReportFormat(query.format);

  try {
    const result = deps.generateReport
      ? await deps.generateReport(periodId, format)
      : { format: 'json' as const, report: { periodId } };

    if (result.format === 'pdf') {
      return binaryResponse(200, result.buffer, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reconciliation-${periodId}.pdf"`,
        'Content-Length': String(result.buffer.length),
        'Cache-Control': 'no-store',
      });
    }

    if (result.format === 'html') {
      return binaryResponse(200, result.html, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      });
    }

    return jsonResponse(200, { success: true, report: result.report });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const isNotFound = message.includes('not found');
    console.error('[GET /api/reconciliations/[periodId]/report] Error:', message);
    return jsonResponse(isNotFound ? 404 : 500, { success: false, error: message });
  }
}
