import { handleDealsExistsGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { findSeedDealBySlug } from '@/lib/marketplace/seed-data';
import { tryDevSessionAuth } from '@/lib/projects/dev-session-auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const auth = await tryDevSessionAuth();

  const result = await handleDealsExistsGet(
    {
      slug: url.searchParams.get('slug') ?? undefined,
      userId: auth?.uid ?? 'user_guest',
    },
    {
      findBySlug: async (normalizedSlug) => findSeedDealBySlug(normalizedSlug),
    },
  );

  return toNextResponse(result);
}
