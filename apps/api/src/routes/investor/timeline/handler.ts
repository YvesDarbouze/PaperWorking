import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  filterInvestorTimeline,
  sortTimelineNewestFirst,
} from '../../../lib/investor/timeline.js';
import type { TimelineActivity } from '../../../lib/timeline/filter.js';

export type LoadInvestorTimelineFn = (input: {
  uid: string;
  email?: string | null;
}) => Promise<{
  activities: TimelineActivity[];
  ownedProjectIds: Set<string>;
  viewerEmails: string[];
  isVendor: boolean;
}>;

export interface InvestorTimelineGetDeps {
  requireAuth?: RequireAuthFn;
  loadTimeline?: LoadInvestorTimelineFn;
}

/**
 * GET /api/investor/timeline
 */
export async function handleInvestorTimelineGet(
  deps: InvestorTimelineGetDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { error: 'Auth not configured' });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    const loaded = deps.loadTimeline
      ? await deps.loadTimeline({ uid: auth.uid, email: auth.email })
      : {
          activities: [],
          ownedProjectIds: new Set<string>(),
          viewerEmails: [auth.email ?? ''].filter(Boolean),
          isVendor: false,
        };

    if (loaded.isVendor) {
      return jsonResponse(404, { error: 'Not Found' });
    }

    const filtered = filterInvestorTimeline(
      loaded.activities,
      loaded.ownedProjectIds,
      auth.uid,
      loaded.viewerEmails,
    );
    const timeline = sortTimelineNewestFirst(filtered);

    return jsonResponse(200, { timeline });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch investor timeline';
    console.error('[Investor Timeline GET]', message);
    return jsonResponse(500, { error: 'Failed to fetch investor timeline' });
  }
}
