import { NextResponse } from 'next/server';
import { buildDealsReadService } from '@/lib/api/handler-deps';
import { dealsErrorResponse } from '@/lib/api/deal-route-errors';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

/** GET /api/deals/exists — slug collision probe (public marketplace or caller-owned deals). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') ?? url.searchParams.get('id') ?? undefined;

  try {
    const user = await resolveAuthUserFromRequest(request);
    const service = buildDealsReadService();
    const result = user
      ? await service.dealExistsForUser(user, slug ?? undefined)
      : await service.dealExists(slug ?? undefined);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = dealsErrorResponse(error);
    if (mapped) return mapped;
    return NextResponse.json({ exists: false, deal: null });
  }
}
