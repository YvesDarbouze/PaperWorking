import { NextResponse } from 'next/server';
import { buildDealsReadService } from '@/lib/api/handler-deps';
import { dealsErrorResponse } from '@/lib/api/deal-route-errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/marketplace/deals — public marketplace-published deals feed.
 * Unauthenticated callers receive published marketplace listings only.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') ?? undefined;

  try {
    const result = await buildDealsReadService().listPublicMarketplaceDeals(q);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = dealsErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch marketplace deals', details: message },
      { status: 500 },
    );
  }
}
