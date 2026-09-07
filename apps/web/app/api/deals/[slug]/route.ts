import { NextResponse } from 'next/server';
import { buildDealsCommandService } from '@/lib/api/handler-deps';
import { dealsErrorResponse } from '@/lib/api/deal-route-errors';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';
import type { UpdateDealInput } from '@paperworking/services';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ slug: string }> };

function parseUpdateBody(body: unknown): UpdateDealInput {
  if (!body || typeof body !== 'object') return {};
  const record = body as Record<string, unknown>;
  const num = (key: string) =>
    typeof record[key] === 'number' && Number.isFinite(record[key]) ? (record[key] as number) : undefined;
  return {
    purchasePrice: num('purchasePrice'),
    rehabCost: num('rehabCost'),
    arv: num('arv'),
    holdingCosts: num('holdingCosts'),
    projectedRoi: num('projectedRoi'),
    projectedMonthlyRent: num('projectedMonthlyRent'),
    projectId: typeof record.projectId === 'string' ? record.projectId : undefined,
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
  };
}

/** GET /api/deals/[slug] — authorized deal detail for owner/collaborators. */
export async function GET(request: Request, context: RouteContext) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await context.params;

  try {
    const result = await buildDealsCommandService().getDealBySlug(user, slug);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = dealsErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch deal', details: message }, { status: 500 });
  }
}

/** PATCH /api/deals/[slug] — update deal baseline underwriting fields. */
export async function PATCH(request: Request, context: RouteContext) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await context.params;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const result = await buildDealsCommandService().updateDealBySlug(user, slug, parseUpdateBody(body));
    return NextResponse.json(result);
  } catch (error) {
    const mapped = dealsErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update deal', details: message }, { status: 500 });
  }
}
