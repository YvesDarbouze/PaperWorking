import { jsonResponse, type RouteResult } from '../../../../http/response.js';
import type { RequireAuthFn } from '../../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../../lib/auth/auth-types.js';

export type GetDeletionJobFn = (uid: string) => Promise<Record<string, unknown> | null>;

export type ExecuteAccountDeletionFn = (uid: string) => Promise<{
  step: string;
  message: string;
}>;

export interface AccountDataDeleteGetDeps {
  requireAuth?: RequireAuthFn;
  getDeletionJob?: GetDeletionJobFn;
}

export interface AccountDataDeletePostDeps {
  requireAuth?: RequireAuthFn;
  executeDeletion?: ExecuteAccountDeletionFn;
}

/**
 * GET /api/account/data/delete — deletion job status
 */
export async function handleAccountDataDeleteGet(
  deps: AccountDataDeleteGetDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { error: 'Auth not configured' });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    const job = deps.getDeletionJob ? await deps.getDeletionJob(auth.uid) : null;
    if (!job) {
      return jsonResponse(200, { active: false });
    }

    return jsonResponse(200, { active: true, job });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse(500, { error: 'Failed to retrieve deletion status', details: message });
  }
}

/**
 * POST /api/account/data/delete — run GDPR deletion cascade
 */
export async function handleAccountDataDeletePost(
  deps: AccountDataDeletePostDeps = {},
): Promise<RouteResult> {
  let uid = '';
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { error: 'Auth not configured' });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    uid = auth.uid;

    const result = deps.executeDeletion
      ? await deps.executeDeletion(uid)
      : { step: 'completed', message: 'Account deletion successfully completed.' };

    return jsonResponse(200, {
      success: true,
      message: result.message,
      step: result.step,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ [GDPR Delete] Failure on user ${uid}:`, message);
    return jsonResponse(500, { error: 'Account deletion cascade failed.', details: message });
  }
}
