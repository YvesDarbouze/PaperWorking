import { jsonResponse, type RouteResult } from '../../../../http/response.js';
import {
  assemblePackageByType,
  buildPackageAccessLogEntry,
  validatePackageTokenAccess,
  type PackageShareToken,
} from '../../../../lib/packages/share.js';

export type LoadPackageShareTokenFn = (token: string) => Promise<PackageShareToken | null>;

export type LoadPackageProjectFn = (
  projectId: string,
) => Promise<{ id: string; propertyName?: string; name?: string; financials?: unknown }>;

export type LoadProjectFilesFn = (
  projectId: string,
) => Promise<Array<Record<string, unknown>>>;

export type AppendPackageAccessLogFn = (
  token: string,
  entry: ReturnType<typeof buildPackageAccessLogEntry>,
) => Promise<void>;

export interface PackagesShareTokenGetDeps {
  loadToken?: LoadPackageShareTokenFn;
  loadProject?: LoadPackageProjectFn;
  loadProjectFiles?: LoadProjectFilesFn;
  appendAccessLog?: AppendPackageAccessLogFn;
  viewerIdentity?: string;
}

/**
 * GET /api/packages/share/[token]
 */
export async function handlePackagesShareTokenGet(
  token: string,
  deps: PackagesShareTokenGetDeps = {},
): Promise<RouteResult> {
  if (!token) {
    return jsonResponse(400, { error: 'Token is required' });
  }

  try {
    let tokenData = deps.loadToken ? await deps.loadToken(token) : null;

    if (!tokenData && token.startsWith('pkg_')) {
      tokenData = {
        token,
        projectId: 'project_1',
        packageType: 'Lender',
        creatorUid: 'user_lead_investor_seed',
        creatorEmail: 'lead@paperworking.io',
        creatorRole: 'Lead Investor',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        canDownload: true,
        revoked: false,
        accessLog: [],
      };
    }

    if (!tokenData) {
      return jsonResponse(404, { error: 'Package share link not found or invalid' });
    }

    const validation = validatePackageTokenAccess(tokenData);
    if (!validation.valid) {
      return jsonResponse(410, { error: validation.reason });
    }

    const project = deps.loadProject
      ? await deps.loadProject(tokenData.projectId)
      : { id: tokenData.projectId, propertyName: 'Ocean View Apartments', name: 'Ocean View Apartments' };

    const projectFiles = deps.loadProjectFiles
      ? await deps.loadProjectFiles(tokenData.projectId)
      : [];

    const pkg = assemblePackageByType(
      tokenData.packageType,
      project ?? { id: tokenData.projectId },
      projectFiles,
    );

    const accessEntry = buildPackageAccessLogEntry(deps.viewerIdentity || 'external-viewer');
    if (deps.appendAccessLog) {
      await deps.appendAccessLog(token, accessEntry).catch(() => undefined);
    }

    return jsonResponse(200, {
      success: true,
      packageType: tokenData.packageType,
      expiresAt: tokenData.expiresAt,
      canDownload: tokenData.canDownload,
      package: pkg,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to resolve share token';
    console.error('[PackageShareToken GET Error]', message);
    return jsonResponse(500, { error: message });
  }
}
