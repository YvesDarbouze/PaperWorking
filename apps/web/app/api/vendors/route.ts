import { NextResponse } from 'next/server';
import { buildVendorsReadService } from '@/lib/api/handler-deps';
import { marketplaceVendorReadErrorResponse } from '@/lib/api/marketplace-route-errors';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';
import {
  getMarketplaceVendorFromStore,
  createVendorRequestInStore,
} from '@/lib/vendor-portal/vendor-store';

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

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Malformed JSON body.' }, { status: 400 });
  }

  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const vendorId = typeof body.vendorId === 'string' ? body.vendorId.trim() : '';
  const projectLabel = typeof body.projectLabel === 'string' ? body.projectLabel.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!vendorId) {
    return NextResponse.json({ error: 'vendorId is required.' }, { status: 400 });
  }
  if (!projectLabel) {
    return NextResponse.json({ error: 'projectLabel is required.' }, { status: 400 });
  }

  const vendor = await getMarketplaceVendorFromStore(vendorId);
  if (!vendor) {
    return NextResponse.json({ error: `Vendor ${vendorId} was not found.` }, { status: 404 });
  }

  const created = await createVendorRequestInStore({
    projectId: typeof body.projectId === 'string' ? body.projectId : '',
    type: typeof vendor.type === 'string' && vendor.type ? vendor.type : 'Vendor Quote',
    message,
    vendorId,
    projectLabel,
    requesterUid: auth.uid,
  });

  return NextResponse.json({ success: true, request: created }, { status: 201 });
}
