import { NextResponse } from 'next/server';
import { buildMarketplaceInvestorsReadService } from '@/lib/api/handler-deps';
import { marketplaceVendorReadErrorResponse } from '@/lib/api/marketplace-route-errors';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

/** GET /api/marketplace/investors — public investor directory. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') ?? undefined;
  const viewer = await resolveAuthUserFromRequest(request);

  try {
    const result = await buildMarketplaceInvestorsReadService().listInvestors(q, viewer);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = marketplaceVendorReadErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch investors', details: message },
      { status: 500 },
    );
  }
}
