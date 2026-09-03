import { NextResponse } from 'next/server';
import { buildDealsCommandService, buildDealsReadService } from '@/lib/api/handler-deps';
import { dealsErrorResponse } from '@/lib/api/deal-route-errors';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';
import type { CreateDealInput } from '@paperworking/services';

export const dynamic = 'force-dynamic';

function parseCreateBody(body: unknown): CreateDealInput {
  if (!body || typeof body !== 'object') return { address: '' };
  const record = body as Record<string, unknown>;
  return {
    address: typeof record.address === 'string' ? record.address : '',
    slug: typeof record.slug === 'string' ? record.slug : undefined,
    purchasePrice:
      typeof record.purchasePrice === 'number' ? record.purchasePrice : undefined,
    rehabCost: typeof record.rehabCost === 'number' ? record.rehabCost : undefined,
    arv: typeof record.arv === 'number' ? record.arv : undefined,
    holdingCosts:
      typeof record.holdingCosts === 'number' ? record.holdingCosts : undefined,
    projectedRoi:
      typeof record.projectedRoi === 'number' ? record.projectedRoi : undefined,
    status:
      record.status === 'draft' ||
      record.status === 'published' ||
      record.status === 'funding' ||
      record.status === 'closed' ||
      record.status === 'archived'
        ? record.status
        : undefined,
    visibility:
      record.visibility === 'marketplace' ||
      record.visibility === 'invitation_only' ||
      record.visibility === 'private'
        ? record.visibility
        : undefined,
    projectId: typeof record.projectId === 'string' ? record.projectId : undefined,
    id: typeof record.id === 'string' ? record.id : undefined,
  };
}

/** GET /api/deals — list deals visible to authenticated user. */
export async function GET(request: Request) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get('q') ?? undefined;
  const tab = url.searchParams.get('tab') ?? undefined;

  try {
    const result = await buildDealsReadService().listDeals(user, { q, tab });
    return NextResponse.json(result);
  } catch (error) {
    const mapped = dealsErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch deals', details: message },
      { status: 500 },
    );
  }
}

/** POST /api/deals — create deal for authorized user (DB-only). */
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
    const result = await buildDealsCommandService().createDeal(user, parseCreateBody(body));
    return NextResponse.json(result);
  } catch (error) {
    const mapped = dealsErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create deal', details: message },
      { status: 500 },
    );
  }
}
