import { jsonResponse, type RouteResult } from '../../../http/response.js';
import { isInboxBackfillAdmin } from '../../../lib/inbox/validation.js';

export type VerifyIdTokenFn = (idToken: string) => Promise<{ uid: string }>;

export type GetUserProfileFn = (uid: string) => Promise<{ orgRole?: string } | null>;

export type RunInboxBackfillFn = () => Promise<{
  created: number;
  skipped: number;
  totalInvitations: number;
}>;

export interface InboxBackfillPostDeps {
  verifyIdToken?: VerifyIdTokenFn;
  getUserProfile?: GetUserProfileFn;
  runBackfill?: RunInboxBackfillFn;
}

/**
 * POST /api/inbox/backfill
 */
export async function handleInboxBackfillPost(
  idToken: string | null | undefined,
  deps: InboxBackfillPostDeps = {},
): Promise<RouteResult> {
  try {
    if (!idToken) {
      return jsonResponse(401, { success: false, error: 'Unauthorized' });
    }

    const decoded = deps.verifyIdToken
      ? await deps.verifyIdToken(idToken)
      : { uid: 'admin-demo' };

    const profile = deps.getUserProfile
      ? await deps.getUserProfile(decoded.uid)
      : { orgRole: 'Lead Investor' };

    if (!profile) {
      return jsonResponse(403, { success: false, error: 'User not found' });
    }

    if (!isInboxBackfillAdmin(profile)) {
      return jsonResponse(403, {
        success: false,
        error: 'Only Lead Investors and Admins can run backfill',
      });
    }

    const result = deps.runBackfill
      ? await deps.runBackfill()
      : { created: 0, skipped: 0, totalInvitations: 0 };

    return jsonResponse(200, { success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Backfill] Error:', message);
    return jsonResponse(500, { success: false, error: message || 'Internal server error' });
  }
}
