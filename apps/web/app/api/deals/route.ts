import { handleDealsGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { SEED_RAW_DEALS } from '@/lib/marketplace/seed-data';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const auth = await requireDevSessionAuth();

  const result = await handleDealsGet(
    {
      tab: url.searchParams.get('tab') ?? undefined,
      search: url.searchParams.get('search') ?? undefined,
      sort: url.searchParams.get('sort') ?? undefined,
    },
    {
      requireAuth: async () => {
        if (isDevAuthFailure(auth)) return auth;
        return { uid: auth.uid };
      },
      listDeals: async () => SEED_RAW_DEALS,
    },
  );

  return toNextResponse(result);
}
