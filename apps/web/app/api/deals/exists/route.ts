import { NextResponse } from 'next/server';
import { buildDealsReadService } from '@/lib/api/handler-deps';
import { dealsErrorResponse } from '@/lib/api/deal-route-errors';

export const dynamic = 'force-dynamic';

/** GET /api/deals/exists — public slug collision probe (marketplace-published only). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') ?? url.searchParams.get('id') ?? undefined;

  try {
    const result = await buildDealsReadService().dealExists(slug ?? undefined);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = dealsErrorResponse(error);
    if (mapped) return mapped;
    return NextResponse.json({ exists: false, deal: null });
  }
}
