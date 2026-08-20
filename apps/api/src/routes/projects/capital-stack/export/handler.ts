import { binaryResponse, jsonResponse, type RouteResult } from '../../../../http/response.js';
import type { RequireAuthFn } from '../../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../../lib/auth/auth-types.js';

export type VerifyCapitalStackExportAccessFn = (
  projectId: string,
  uid: string,
) => Promise<{ authorized: boolean; address?: string }>;

export type GenerateCapitalStackPdfFn = (input: {
  projectId: string;
  projectData: Record<string, unknown>;
  commitments: Array<Record<string, unknown>>;
  address: string;
  dateStr: string;
}) => Promise<Uint8Array>;

export type LoadCapitalStackExportDataFn = (
  projectId: string,
) => Promise<{
  projectData: Record<string, unknown>;
  commitments: Array<Record<string, unknown>>;
} | null>;

export interface ProjectsCapitalStackExportGetDeps {
  requireAuth?: RequireAuthFn;
  verifyAccess?: VerifyCapitalStackExportAccessFn;
  loadExportData?: LoadCapitalStackExportDataFn;
  generatePdf?: GenerateCapitalStackPdfFn;
  trackExport?: (input: { uid: string; projectId: string }) => Promise<void>;
}

function buildCapitalStackFilename(address: string, dateStr: string): string {
  const slug = address
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60);
  return `capital-stack-statement-${slug}-${dateStr}.pdf`;
}

/**
 * GET /api/projects/[id]/capital-stack/export
 */
export async function handleProjectsCapitalStackExportGet(
  projectId: string,
  deps: ProjectsCapitalStackExportGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const access = deps.verifyAccess
    ? await deps.verifyAccess(projectId, auth.uid)
    : { authorized: true, address: projectId };

  if (!access.authorized) {
    return jsonResponse(403, { error: 'Access denied' });
  }

  try {
    const loaded = deps.loadExportData
      ? await deps.loadExportData(projectId)
      : { projectData: { address: projectId, financials: {} }, commitments: [] };

    if (!loaded) {
      return jsonResponse(404, { error: 'Project not found' });
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const displayAddress = (loaded.projectData.address as string | undefined) ?? projectId;

    if (deps.trackExport) {
      await deps.trackExport({ uid: auth.uid, projectId }).catch(() => undefined);
    }

    const pdfBytes = deps.generatePdf
      ? await deps.generatePdf({
          projectId,
          projectData: loaded.projectData,
          commitments: loaded.commitments,
          address: displayAddress,
          dateStr,
        })
      : new Uint8Array([0x25, 0x50, 0x44, 0x46]);

    const filename = buildCapitalStackFilename(displayAddress, dateStr);

    return binaryResponse(200, pdfBytes, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Capital Stack Export] Failed:', message);
    return jsonResponse(500, { error: 'Failed to export capital stack' });
  }
}
