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
import type {
  VendorPortalProfileUpdateInput,
  VendorPortalRequestUpdateInput,
} from '@paperworking/services';

export const dynamic = 'force-dynamic';

/** GET /api/vendor-portal/profile — self-scoped vendor portal profile. */
export async function GET(request: Request) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await buildVendorPortalReadService().getPortalProfile(user);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = marketplaceVendorReadErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch vendor profile', details: message },
      { status: 500 },
    );
  }
}

function parseProfileBody(body: unknown): VendorPortalProfileUpdateInput {
  if (!body || typeof body !== 'object') return {};
  const record = body as Record<string, unknown>;
  return {
    name: typeof record.name === 'string' ? record.name : undefined,
    companyName: typeof record.companyName === 'string' ? record.companyName : undefined,
    type: typeof record.type === 'string' ? record.type : undefined,
    contactPhone: typeof record.contactPhone === 'string' ? record.contactPhone : undefined,
    organizationId: typeof record.organizationId === 'string' ? record.organizationId : undefined,
  };
}

/** PUT /api/vendor-portal/profile — self-scoped vendor profile update. */
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
    const result = await buildVendorPortalCommandService().updateProfile(
      user,
      parseProfileBody(body),
    );
    return NextResponse.json(result);
  } catch (error) {
    const mapped = marketplaceVendorCommandErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update vendor profile', details: message },
      { status: 500 },
    );
  }
}
