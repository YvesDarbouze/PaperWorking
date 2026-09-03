import { NextResponse } from 'next/server';
import { buildMarketplaceProfileReadService } from '@/lib/api/handler-deps';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

/** GET /api/marketplace/profile — self-scoped marketplace profile for authenticated user. */
export async function GET(request: Request) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await buildMarketplaceProfileReadService().getMarketplaceProfile(user);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch marketplace profile', details: message },
      { status: 500 },
    );
  }
}
