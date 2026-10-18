import { handleMarketplaceInvestorsFollowPost } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { updateFollowStateInStore } from '@/lib/marketplace/investor-store';
import { tryDevSessionAuth } from '@/lib/projects/dev-session-auth';

export async function POST(request: Request) {
  const sessionAuth = await tryDevSessionAuth();
  let body: { targetUid?: unknown; follow?: unknown } = {};

  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const result = await handleMarketplaceInvestorsFollowPost(body, {
    requireAuth: async () => {
      if (process.env.TEST_AUTH_UID === 'unauthenticated') {
        return { status: 401, body: { error: 'Unauthorized' } };
      }
      return { uid: sessionAuth?.uid ?? 'dev-user-1' };
    },
    updateFollow: async (followerUid, targetUid, follow) =>
      updateFollowStateInStore(followerUid, targetUid, follow),
  });

  return toNextResponse(result);
}
