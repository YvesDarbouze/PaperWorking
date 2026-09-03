import { NextResponse } from 'next/server';
import { buildMarketplaceInvestorsReadService } from '@/lib/api/handler-deps';
import { marketplaceVendorReadErrorResponse } from '@/lib/api/marketplace-route-errors';

export const dynamic = 'force-dynamic';

/** GET /api/marketplace/listings — public marketplace listings feed. */
export async function GET() {
  try {
    const result = await buildMarketplaceInvestorsReadService().listListings();
    return NextResponse.json(result);
  } catch (error) {
    const mapped = marketplaceVendorReadErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch listings', details: message },
      { status: 500 },
    );
  }
}
