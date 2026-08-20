import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  canCreateShareLink,
  createShareTokenRecord,
  type PackageShareToken,
  type PackageType,
  validatePackageShareCreateBody,
} from '../../../lib/packages/share.js';

export type PersistShareTokenFn = (record: PackageShareToken) => Promise<void>;

export type RevokeShareTokenFn = (token: string, revokedBy: string) => Promise<void>;

export type LoadShareTokenFn = (token: string) => Promise<PackageShareToken | null>;

export interface PackagesSharePostDeps {
  requireAuth?: RequireAuthFn;
  userRole?: string;
  userEmail?: string;
  persistToken?: PersistShareTokenFn;
  logAudit?: (event: Record<string, unknown>) => Promise<void>;
}

export interface PackagesShareDeleteDeps {
  requireAuth?: RequireAuthFn;
  loadToken?: LoadShareTokenFn;
  revokeToken?: RevokeShareTokenFn;
  logAudit?: (event: Record<string, unknown>) => Promise<void>;
}

/**
 * POST /api/packages/share
 */
export async function handlePackagesSharePost(
  body: {
    projectId?: unknown;
    packageType?: unknown;
    expiryDays?: unknown;
    canDownload?: unknown;
  },
  deps: PackagesSharePostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const validated = validatePackageShareCreateBody(body);
  if (!validated.ok) {
    return jsonResponse(validated.status, { error: validated.error });
  }

  const userRole = deps.userRole || 'Lead Investor';
  if (!canCreateShareLink(userRole)) {
    return jsonResponse(403, {
      error: `Access denied: Role '${userRole}' is not authorized to generate share links.`,
    });
  }

  try {
    const tokenRecord = createShareTokenRecord({
      projectId: validated.projectId,
      packageType: validated.packageType as PackageType,
      creatorUid: auth.uid,
      creatorEmail: deps.userEmail || auth.email || '',
      creatorRole: userRole,
      expiryDays: validated.expiryDays,
      canDownload: validated.canDownload,
    });

    if (deps.persistToken) {
      await deps.persistToken(tokenRecord);
    }

    if (deps.logAudit) {
      await deps.logAudit({
        eventType: 'package_shared',
        projectId: validated.projectId,
        packageType: validated.packageType,
        token: tokenRecord.token,
        creatorUid: auth.uid,
      }).catch(() => undefined);
    }

    return jsonResponse(200, {
      success: true,
      token: tokenRecord.token,
      shareUrl: `/share/package/${tokenRecord.token}`,
      expiresAt: tokenRecord.expiresAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create share link';
    console.error('[PackageShare POST Error]', message);
    return jsonResponse(500, { error: message });
  }
}

/**
 * DELETE /api/packages/share?token=
 */
export async function handlePackagesShareDelete(
  query: { token?: string | null },
  deps: PackagesShareDeleteDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const token = query.token?.trim() || '';
  if (!token) {
    return jsonResponse(400, { error: 'token is required' });
  }

  const existing = deps.loadToken ? await deps.loadToken(token) : { token } as PackageShareToken;
  if (!existing && deps.loadToken) {
    return jsonResponse(404, { error: 'Share token not found' });
  }

  if (deps.revokeToken) {
    await deps.revokeToken(token, auth.uid);
  }

  if (deps.logAudit) {
    await deps.logAudit({
      eventType: 'package_link_revoked',
      token,
      revokedBy: auth.uid,
    }).catch(() => undefined);
  }

  return jsonResponse(200, { success: true, message: 'Share link revoked' });
}
