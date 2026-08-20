import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  buildTaxShareRecord,
  serializeTaxShareListItem,
  validateTaxShareAccess,
  validateTaxShareCreateBody,
} from '../../../lib/tax/share.js';

export type LoadUserOrganizationFn = (uid: string) => Promise<string | null>;
export type CreateTaxShareFn = (record: Record<string, unknown>) => Promise<void>;
export type ListTaxSharesFn = (uid: string) => Promise<Array<Record<string, unknown>>>;
export type LoadTaxShareFn = (token: string) => Promise<Record<string, unknown> | null>;
export type RevokeTaxShareFn = (token: string) => Promise<void>;
export type BuildTaxSharePayloadFn = (input: {
  share: Record<string, unknown>;
  taxYear: number;
  projectIds: string[];
}) => Promise<Record<string, unknown>>;

/**
 * POST /api/tax/share
 */
export async function handleTaxSharePost(
  body: Record<string, unknown>,
  deps: {
    requireAuth?: RequireAuthFn;
    loadOrganization?: LoadUserOrganizationFn;
    createShare?: CreateTaxShareFn;
  } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const validated = validateTaxShareCreateBody(body);
    if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

    const organizationId = deps.loadOrganization
      ? (await deps.loadOrganization(auth.uid)) || 'personal'
      : 'personal';

    const token = crypto.randomUUID();
    const shareData = buildTaxShareRecord({
      token,
      userId: auth.uid,
      organizationId,
      taxYear: validated.taxYear,
      projectIds: validated.projectIds,
    });

    if (deps.createShare) await deps.createShare(shareData);

    return jsonResponse(200, {
      success: true,
      token,
      shareUrl: `/share/${token}`,
      expiresAt: shareData.expiresAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Tax share] POST Error:', message);
    return jsonResponse(500, { error: 'Failed to create share link' });
  }
}

/**
 * GET /api/tax/share
 */
export async function handleTaxShareGet(
  deps: {
    requireAuth?: RequireAuthFn;
    listShares?: ListTaxSharesFn;
  } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const shares = deps.listShares ? await deps.listShares(auth.uid) : [];
    return jsonResponse(200, {
      success: true,
      shares: shares.map((share) => serializeTaxShareListItem(share)),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Tax share] GET Error:', message);
    return jsonResponse(500, { error: 'Failed to retrieve share links' });
  }
}

/**
 * GET /api/tax/share/[token]
 */
export async function handleTaxShareTokenGet(
  token: string,
  deps: {
    loadShare?: LoadTaxShareFn;
    buildPayload?: BuildTaxSharePayloadFn;
  } = {},
): Promise<RouteResult> {
  if (!token) return jsonResponse(400, { error: 'Valid token is required' });

  try {
    const share = deps.loadShare ? await deps.loadShare(token) : null;
    if (!share) return jsonResponse(404, { error: 'Share link not found or invalid' });

    const access = validateTaxShareAccess(share);
    if (!access.ok) return jsonResponse(access.status, { error: access.error });

    const payload = deps.buildPayload
      ? await deps.buildPayload({
          share,
          taxYear: Number(share.taxYear),
          projectIds: (share.projectIds as string[]) || [],
        })
      : {
          success: true,
          taxYear: share.taxYear,
          previews: [],
          aggregatedSchedE: {},
          plReports: [],
          aggregatedPL: {},
        };

    return jsonResponse(200, payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Tax share GET token] Error:', message);
    return jsonResponse(500, { error: 'Failed to retrieve tax share data', details: message });
  }
}

/**
 * POST /api/tax/share/revoke
 */
export async function handleTaxShareRevokePost(
  body: Record<string, unknown>,
  deps: {
    requireAuth?: RequireAuthFn;
    loadShare?: LoadTaxShareFn;
    revokeShare?: RevokeTaxShareFn;
  } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const token = typeof body.token === 'string' ? body.token : '';
    if (!token) return jsonResponse(400, { error: 'Valid token is required' });

    const share = deps.loadShare ? await deps.loadShare(token) : null;
    if (!share) return jsonResponse(404, { error: 'Share link not found' });
    if (share.userId !== auth.uid) {
      return jsonResponse(403, { error: 'Unauthorized to revoke this link' });
    }

    if (deps.revokeShare) await deps.revokeShare(token);
    return jsonResponse(200, { success: true, message: 'Share link revoked successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Tax share revoke] Error:', message);
    return jsonResponse(500, { error: 'Failed to revoke share link' });
  }
}
