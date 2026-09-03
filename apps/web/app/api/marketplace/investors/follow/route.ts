import { NextResponse } from 'next/server';
import { buildMarketplaceFollowCommandService } from '@/lib/api/handler-deps';
import { marketplaceVendorCommandErrorResponse } from '@/lib/api/marketplace-route-errors';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';
import type { SetInvestorFollowInput } from '@paperworking/services';

export const dynamic = 'force-dynamic';

function parseFollowBody(body: unknown): SetInvestorFollowInput {
  if (!body || typeof body !== 'object') return {};
  const record = body as Record<string, unknown>;
  return {
    targetUid: typeof record.targetUid === 'string' ? record.targetUid : undefined,
    investorId: typeof record.investorId === 'string' ? record.investorId : undefined,
    id: typeof record.id === 'string' ? record.id : undefined,
    follow: record.follow === false ? false : record.follow === true ? true : undefined,
  };
}

/** POST /api/marketplace/investors/follow — authenticated follow/unfollow. */
export async function POST(request: Request) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const result = await buildMarketplaceFollowCommandService().setInvestorFollow(
      user,
      parseFollowBody(body),
    );
    return NextResponse.json(result);
  } catch (error) {
    const mapped = marketplaceVendorCommandErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Could not update follow state.', details: message },
      { status: 500 },
    );
  }
}
