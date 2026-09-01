import { NextResponse } from 'next/server';
import {
  buildVendorPortalCommandService,
  buildVendorPortalReadService,
} from '@/lib/api/handler-deps';
import {
  marketplaceVendorCommandErrorResponse,
  marketplaceVendorReadErrorResponse,
} from '@/lib/api/marketplace-route-errors';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';
import type { VendorPortalRequestUpdateInput } from '@paperworking/services';

export const dynamic = 'force-dynamic';

/** GET /api/vendor-portal/requests — self-scoped vendor bid inbox. */
export async function GET(request: Request) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await buildVendorPortalReadService().listPortalRequests(user);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = marketplaceVendorReadErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch vendor requests', details: message },
      { status: 500 },
    );
  }
}

function parseRequestBody(body: unknown): VendorPortalRequestUpdateInput {
  if (!body || typeof body !== 'object') return {};
  const record = body as Record<string, unknown>;
  return {
    id: typeof record.id === 'string' ? record.id : undefined,
    bidId: typeof record.bidId === 'string' ? record.bidId : undefined,
    requestId: typeof record.requestId === 'string' ? record.requestId : undefined,
    status: typeof record.status === 'string' ? record.status : undefined,
    quotedFee: typeof record.quotedFee === 'number' ? record.quotedFee : undefined,
    bidAmount:
      typeof record.bidAmount === 'number' || typeof record.bidAmount === 'bigint'
        ? record.bidAmount
        : undefined,
    notes: typeof record.notes === 'string' ? record.notes : undefined,
    message: typeof record.message === 'string' ? record.message : undefined,
  };
}

/** PUT /api/vendor-portal/requests — self-scoped vendor bid/request update. */
export async function PUT(request: Request) {
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
    const result = await buildVendorPortalCommandService().updateRequest(
      user,
      parseRequestBody(body),
    );
    return NextResponse.json(result);
  } catch (error) {
    const mapped = marketplaceVendorCommandErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update vendor request', details: message },
      { status: 500 },
    );
  }
}
