import { handleMarketplaceInvestorsFollowPost } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { updateSeedFollowState } from '@/lib/marketplace/seed-data';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';

export async function POST(request: Request) {
  const auth = await requireDevSessionAuth();
  let body: { targetUid?: unknown; follow?: unknown } = {};

  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const result = await handleMarketplaceInvestorsFollowPost(body, {
    requireAuth: async () => {
      if (isDevAuthFailure(auth)) return auth;
      return { uid: auth.uid };
    },
    updateFollow: async (followerUid, targetUid, follow) =>
      updateSeedFollowState(followerUid, targetUid, follow),
  });

  return toNextResponse(result);
}
