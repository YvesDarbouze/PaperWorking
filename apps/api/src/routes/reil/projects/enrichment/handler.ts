import { jsonResponse, type RouteResult } from '../../../../http/response.js';
import type { RequireAuthFn } from '../../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../../lib/auth/auth-types.js';
import { canWriteReilProject } from '../../../../lib/reil/access.js';
import {
  resolvePropertyLookupKey,
  serializeValuationSnapshots,
  shouldReturnCachedProperty,
} from '../../../../lib/reil/listings.js';

export type GetReilProjectFn = (id: string) => Promise<Record<string, unknown> | null>;
export type EnrichReilPropertyFn = (input: {
  projectId: string;
  lookupKey: string;
  uid: string;
}) => Promise<Record<string, unknown>>;
export type GetValuationSnapshotsFn = (projectId: string) => Promise<Array<Record<string, unknown>>>;
export type CreateValuationSnapshotFn = (input: {
  projectId: string;
  lookupKey: string;
  uid: string;
}) => Promise<Record<string, unknown>>;

/**
 * POST /api/reil/projects/[id]/property
 */
export async function handleReilProjectPropertyPost(
  projectId: string,
  body: Record<string, unknown>,
  deps: {
    requireAuth?: RequireAuthFn;
    isAdmin?: boolean;
    providerType?: string;
    getProject?: GetReilProjectFn;
    enrichProperty?: EnrichReilPropertyFn;
  } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const project = deps.getProject ? await deps.getProject(projectId) : null;
  if (!project) return jsonResponse(404, { error: 'Not found' });
  if (!canWriteReilProject(project as { createdById: string }, auth.uid)) {
    return jsonResponse(403, { error: 'Forbidden' });
  }

  const forceRefresh = body.forceRefresh === true;
  if (forceRefresh && !deps.isAdmin) {
    return jsonResponse(403, { error: 'forceRefresh requires admin claim' });
  }
  if (shouldReturnCachedProperty(project.lastSyncedAt as string | Date | undefined, forceRefresh)) {
    return jsonResponse(200, {
      cached: true,
      lastSyncedAt: project.lastSyncedAt,
      message: 'Property data is fresh (< 1 hour old). Pass forceRefresh: true with admin claim to override.',
    });
  }

  const lookupKey = resolvePropertyLookupKey({
    providerType: deps.providerType ?? 'mock',
    project: project as { addressLine?: string | null; placeId?: string | null },
    bodyPlaceId: typeof body.placeId === 'string' ? body.placeId : undefined,
  });
  if (!lookupKey) {
    return jsonResponse(422, { error: 'No address or placeId available to look up property data.' });
  }

  try {
    const payload = deps.enrichProperty
      ? await deps.enrichProperty({ projectId, lookupKey, uid: auth.uid })
      : { facts: {}, compsCount: 0, rentalCompsCount: 0, sourceProvider: 'mock' };
    return jsonResponse(200, payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if ((err as { name?: string }).name === 'PropertyNotFoundError') {
      return jsonResponse(200, {
        facts: null,
        compsCount: 0,
        rentalCompsCount: 0,
        manualEntryRequired: true,
        sourceProvider: deps.providerType ?? 'mock',
        message: 'No property record found for this address. You can enter details manually.',
      });
    }
    console.error('[Property Route]', message);
    return jsonResponse(502, { error: 'Property data provider error. Please try again.' });
  }
}

/**
 * GET /api/reil/projects/[id]/valuation
 */
export async function handleReilProjectValuationGet(
  projectId: string,
  deps: { requireAuth?: RequireAuthFn; getProject?: GetReilProjectFn; getSnapshots?: GetValuationSnapshotsFn } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const project = deps.getProject ? await deps.getProject(projectId) : null;
  if (!project) return jsonResponse(404, { error: 'Not found' });
  if (!canWriteReilProject(project as { createdById: string }, auth.uid)) {
    return jsonResponse(403, { error: 'Forbidden' });
  }

  const snapshots = deps.getSnapshots ? await deps.getSnapshots(projectId) : [];
  return jsonResponse(200, { snapshots: serializeValuationSnapshots(snapshots) });
}

/**
 * POST /api/reil/projects/[id]/valuation
 */
export async function handleReilProjectValuationPost(
  projectId: string,
  deps: {
    requireAuth?: RequireAuthFn;
    getProject?: GetReilProjectFn;
    createSnapshot?: CreateValuationSnapshotFn;
  } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const project = deps.getProject ? await deps.getProject(projectId) : null;
  if (!project) return jsonResponse(404, { error: 'Not found' });
  if (!canWriteReilProject(project as { createdById: string }, auth.uid)) {
    return jsonResponse(403, { error: 'Forbidden' });
  }

  const lookupKey = (project.addressLine as string | undefined) || (project.placeId as string | undefined);
  if (!lookupKey) {
    return jsonResponse(422, { error: 'No address available to look up valuation.' });
  }

  try {
    const snapshot = deps.createSnapshot
      ? await deps.createSnapshot({ projectId, lookupKey, uid: auth.uid })
      : { id: 'snap-1', projectId, valueCents: 25000000, valueLowCents: 0, valueHighCents: 0, source: 'mock' };
    return jsonResponse(200, {
      snapshot: serializeValuationSnapshots([snapshot])[0],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Valuation Route]', message);
    return jsonResponse(502, { error: message || 'Failed to trigger valuation update' });
  }
}
