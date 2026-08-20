import { binaryResponse, jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import { computeExitWaterfall, parseExitCompleteBody } from '../../../lib/exit/complete.js';

export type CompleteProjectExitFn = (input: {
  uid: string;
  projectId: string;
  strategy: string;
  waterfall: ReturnType<typeof computeExitWaterfall>;
}) => Promise<{ pdfBuffer: Uint8Array; fileName: string }>;

export interface ExitCompletePostDeps {
  requireAuth?: RequireAuthFn;
  loadProjectFinancials?: (projectId: string) => Promise<Record<string, unknown> | null>;
  completeExit?: CompleteProjectExitFn;
}

/**
 * POST /api/exit/complete
 */
export async function handleExitCompletePost(
  body: { projectId?: unknown; strategy?: unknown },
  deps: ExitCompletePostDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { error: 'Auth not configured' });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    const parsed = parseExitCompleteBody(body);
    if (!parsed.ok) {
      return jsonResponse(400, { error: parsed.error });
    }

    const financials = deps.loadProjectFinancials
      ? await deps.loadProjectFinancials(parsed.projectId)
      : {};

    if (financials === null) {
      return jsonResponse(404, { error: 'Project not found' });
    }

    const waterfall = computeExitWaterfall(financials);

    const result = deps.completeExit
      ? await deps.completeExit({
          uid: auth.uid,
          projectId: parsed.projectId,
          strategy: parsed.strategy,
          waterfall,
        })
      : {
          pdfBuffer: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
          fileName: `TaxPacket_${parsed.projectId}.pdf`,
        };

    return binaryResponse(200, result.pdfBuffer, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[exit-complete] Server failure:', message);
    return jsonResponse(500, { error: 'Internal Server Error' });
  }
}
