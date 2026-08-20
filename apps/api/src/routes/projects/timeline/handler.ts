import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  filterTimelineActivities,
  isLeadInvestorOrTeammateRole,
  isVendorAccount,
  sortTimelineDescending,
  type TimelineActivity,
} from '../../../lib/timeline/filter.js';

export type LoadProjectTimelineFn = (input: {
  projectId: string;
  uid: string;
  email?: string | null;
}) => Promise<
  | {
      ok: true;
      activities: TimelineActivity[];
      isLeadInvestorOrTeammate: boolean;
      viewerEmails: string[];
    }
  | { ok: false; status: number; error: string }
>;

export interface ProjectTimelineGetDeps {
  requireAuth?: RequireAuthFn;
  isVendorUser?: (uid: string) => Promise<boolean>;
  loadTimeline?: LoadProjectTimelineFn;
}

/**
 * GET /api/projects/[id]/timeline
 */
export async function handleProjectTimelineGet(
  projectId: string,
  deps: ProjectTimelineGetDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { error: 'Auth not configured' });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    if (deps.isVendorUser && (await deps.isVendorUser(auth.uid))) {
      return jsonResponse(404, { error: 'Not Found' });
    }

    const loaded = deps.loadTimeline
      ? await deps.loadTimeline({
          projectId,
          uid: auth.uid,
          email: auth.email,
        })
      : {
          ok: true as const,
          activities: [],
          isLeadInvestorOrTeammate: true,
          viewerEmails: [auth.email ?? ''].filter(Boolean),
        };

    if (!loaded.ok) {
      return jsonResponse(loaded.status, { error: loaded.error });
    }

    const sorted = sortTimelineDescending(loaded.activities);
    const filtered = filterTimelineActivities(
      sorted,
      auth.uid,
      loaded.viewerEmails,
      loaded.isLeadInvestorOrTeammate,
    );

    return jsonResponse(200, { timeline: filtered });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch timeline';
    console.error('[Timeline GET]', message);
    return jsonResponse(500, { error: 'Failed to fetch timeline' });
  }
}

export { isLeadInvestorOrTeammateRole, isVendorAccount };
