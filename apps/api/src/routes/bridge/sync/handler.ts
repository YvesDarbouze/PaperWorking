import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';

export type EnqueueBridgeSyncFn = () => Promise<string>;
export type LoadBridgeSyncStateFn = () => Promise<{
  lastWatermark: string;
  updatedAt: string;
} | null>;
export type GetBridgeSyncQueueDepthFn = () => Promise<number | null>;

export type CheckBridgeSyncAdminFn = (uid: string) => Promise<boolean> | boolean;

export interface BridgeSyncPostDeps {
  requireAuth?: RequireAuthFn;
  checkAdmin?: CheckBridgeSyncAdminFn;
  enqueueSync?: EnqueueBridgeSyncFn;
}

export interface BridgeSyncGetDeps {
  requireAuth?: RequireAuthFn;
  loadSyncState?: LoadBridgeSyncStateFn;
  getQueueDepth?: GetBridgeSyncQueueDepthFn;
}

/**
 * POST /api/bridge/sync
 */
export async function handleBridgeSyncPost(
  deps: BridgeSyncPostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  if (!(deps.checkAdmin ? await deps.checkAdmin(auth.uid) : false)) {
    return jsonResponse(403, { error: 'Admin claim required to trigger MLS sync' });
  }

  try {
    const jobId = deps.enqueueSync ? await deps.enqueueSync() : `job_${Date.now()}`;
    return jsonResponse(
      202,
      {
        accepted: true,
        jobId,
        message: 'Sync job enqueued. Call /api/worker/drain to process.',
      },
    );
  } catch (error: unknown) {
    console.error('❌ [API BRIDGE SYNC] Failed to enqueue job:', error);
    return jsonResponse(500, { error: 'Failed to enqueue sync job.' });
  }
}

/**
 * GET /api/bridge/sync
 */
export async function handleBridgeSyncGet(
  deps: BridgeSyncGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const state = deps.loadSyncState ? await deps.loadSyncState() : null;
    let queueDepth: number | null = null;
    if (deps.getQueueDepth) {
      try {
        queueDepth = await deps.getQueueDepth();
      } catch {
        queueDepth = null;
      }
    }
    return jsonResponse(200, {
      active: true,
      lastWatermark: state?.lastWatermark ?? 'None',
      updatedAt: state?.updatedAt ?? 'None',
      queueDepth,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[BRIDGE SYNC GET]', message);
    return jsonResponse(500, { error: 'Failed to retrieve sync status.' });
  }
}
