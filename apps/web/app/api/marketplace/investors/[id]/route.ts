import { NextResponse } from 'next/server';
import { buildMarketplaceInvestorsReadService } from '@/lib/api/handler-deps';
import { marketplaceVendorReadErrorResponse } from '@/lib/api/marketplace-route-errors';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/marketplace/investors/[id] — public investor profile detail. */
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const viewer = await resolveAuthUserFromRequest(request);

  try {
    const result = await buildMarketplaceInvestorsReadService().getInvestorById(id, viewer);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = marketplaceVendorReadErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch investor', details: message },
      { status: 500 },
    );
  }
}
