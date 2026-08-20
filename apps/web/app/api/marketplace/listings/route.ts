import { handleMarketplaceListingsGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { SEED_MARKETPLACE_LISTINGS } from '@/lib/marketplace/seed-data';
import { tryDevSessionAuth } from '@/lib/projects/dev-session-auth';

export async function GET() {
  const result = await handleMarketplaceListingsGet({
    tryAuthenticate: tryDevSessionAuth,
    listListings: async () => SEED_MARKETPLACE_LISTINGS,
  });

  return toNextResponse(result);
}
