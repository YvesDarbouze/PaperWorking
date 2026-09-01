import { NextResponse } from 'next/server';
import { buildVendorsReadService } from '@/lib/api/handler-deps';
import { marketplaceVendorReadErrorResponse } from '@/lib/api/marketplace-route-errors';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

/** GET /api/vendors — authenticated vendor directory for caller org scope. */
export async function GET(request: Request) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get('q') ?? undefined;

  try {
    const result = await buildVendorsReadService().listVendors(user, q);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = marketplaceVendorReadErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch vendors', details: message },
      { status: 500 },
    );
  }
}
