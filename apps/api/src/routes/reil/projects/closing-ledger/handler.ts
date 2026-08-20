import { binaryResponse, jsonResponse, type RouteResult } from '../../../../http/response.js';
import type { RequireAuthFn } from '../../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../../lib/auth/auth-types.js';
import {
  buildClosingLedgerBasename,
  buildClosingLedgerCsv,
} from '../../../../lib/reil/closing-ledger.js';

export type LoadClosingLedgerProjectFn = (
  projectId: string,
  uid: string,
) => Promise<{ authorized: boolean; address?: string; financials?: Record<string, unknown> } | null>;
export type BuildClosingCostLinesFn = (
  financials: Record<string, unknown>,
) => { lines: Array<{ label: string; isOverridden: boolean; computed: number; override?: number; amount: number; basis?: string }>; total: number };
export type BuildClosingLedgerPdfFn = (
  lines: Array<{ label: string; isOverridden: boolean; computed: number; override?: number; amount: number; basis?: string }>,
  total: number,
  address: string,
  date: string,
) => Uint8Array;

/**
 * GET /api/reil/projects/[id]/closing-ledger/export
 */
export async function handleReilClosingLedgerExportGet(
  projectId: string,
  query: { format?: string | null },
  deps: {
    requireAuth?: RequireAuthFn;
    loadProject?: LoadClosingLedgerProjectFn;
    buildLines?: BuildClosingCostLinesFn;
    buildPdf?: BuildClosingLedgerPdfFn;
    trackExport?: (input: { uid: string; projectId: string; format: string }) => Promise<void>;
  } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const loaded = deps.loadProject ? await deps.loadProject(projectId, auth.uid) : { authorized: true, address: projectId };
  if (!loaded?.authorized) {
    return jsonResponse(loaded ? 403 : 404, {
      error: loaded ? 'Access denied: not a project member' : 'Project not found',
    });
  }

  const format = query.format === 'pdf' ? 'pdf' : 'csv';
  if (deps.trackExport) {
    await deps.trackExport({ uid: auth.uid, projectId, format }).catch(() => undefined);
  }

  const financials = loaded.financials ?? {};
  const built = deps.buildLines
    ? deps.buildLines(financials)
    : {
        lines: [{ label: 'Title Insurance', isOverridden: false, computed: 1000, amount: 1000, basis: '1% of price' }],
        total: 1000,
      };

  const dateStr = new Date().toISOString().split('T')[0];
  const displayAddress = loaded.address ?? projectId;
  const basename = buildClosingLedgerBasename(displayAddress, projectId, dateStr);

  if (format === 'csv') {
    const csv = buildClosingLedgerCsv(built.lines, built.total, displayAddress, dateStr);
    return binaryResponse(200, csv, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${basename}.csv"`,
      'Cache-Control': 'no-store',
    });
  }

  const pdfBytes = deps.buildPdf
    ? deps.buildPdf(built.lines, built.total, displayAddress, dateStr)
    : new Uint8Array([37, 80, 68, 70]);
  return binaryResponse(200, pdfBytes, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${basename}.pdf"`,
    'Cache-Control': 'no-store',
  });
}
