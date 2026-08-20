import { binaryResponse, jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import { rowsToCsv, validateReportingExportBody } from '../../../lib/reporting/export.js';

export type AuthorizeExportProjectsFn = (
  uid: string,
  projectIds: string[],
) => Promise<Array<Record<string, unknown>> | { error: string; status: number }>;
export type BuildExportRowsFn = (
  type: string,
  projects: Array<Record<string, unknown>>,
) => string[][];

/**
 * POST /api/reporting/export
 */
export async function handleReportingExportPost(
  body: Record<string, unknown>,
  deps: {
    requireAuth?: RequireAuthFn;
    authorizeProjects?: AuthorizeExportProjectsFn;
    buildRows?: BuildExportRowsFn;
  } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { success: false, error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const validated = validateReportingExportBody(body);
    if (!validated.ok) return jsonResponse(validated.status, { success: false, error: validated.error });

    const projectsResult = deps.authorizeProjects
      ? await deps.authorizeProjects(auth.uid, validated.projectIds)
      : validated.projectIds.map((id) => ({ id }));
    if ('error' in (projectsResult as { error?: string })) {
      const denied = projectsResult as { error: string; status: number };
      return jsonResponse(denied.status, { success: false, error: denied.error });
    }

    const dataRows = deps.buildRows
      ? deps.buildRows(validated.type, projectsResult as Array<Record<string, unknown>>)
      : [['Column', 'Value'], ['Sample', '0']];

    if (validated.format === 'csv') {
      return binaryResponse(200, rowsToCsv(dataRows), {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="export_${validated.type}.csv"`,
      });
    }

    return jsonResponse(200, { success: true, data: dataRows });
  } catch (err: unknown) {
    console.error('[Export]', err);
    return jsonResponse(500, { success: false, error: 'Failed to generate export' });
  }
}
