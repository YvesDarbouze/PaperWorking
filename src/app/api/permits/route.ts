import { NextResponse } from 'next/server';
import { lookupPermit, PermitLookupSchema, JurisdictionNotSupportedError, ExternalApiError } from '@/lib/services/permitService';

/**
 * GET /api/permits?propertyAddress=...&jurisdictionId=...&permitNumber=...
 *
 * Queries the real municipal Open Data registry (Socrata) for the given
 * property address / permit number. Returns actual permit status — never
 * a hardcoded value.
 *
 * Query params:
 *   propertyAddress  string  required
 *   jurisdictionId   string  required  (e.g. "miami-dade")
 *   permitNumber     string  optional
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const parse = PermitLookupSchema.safeParse({
    propertyAddress: searchParams.get('propertyAddress') ?? '',
    jurisdictionId:  searchParams.get('jurisdictionId')  ?? '',
    permitNumber:    searchParams.get('permitNumber')     ?? undefined,
  });

  if (!parse.success) {
    return NextResponse.json(
      { success: false, error: parse.error.issues.map((i) => i.message).join('; ') },
      { status: 400 },
    );
  }

  try {
    const permit = await lookupPermit(parse.data);
    return NextResponse.json({ success: true, permit });
  } catch (err) {
    if (err instanceof JurisdictionNotSupportedError) {
      return NextResponse.json(
        { success: false, error: err.message, code: 'JURISDICTION_NOT_SUPPORTED' },
        { status: 422 },
      );
    }
    if (err instanceof ExternalApiError) {
      return NextResponse.json(
        { success: false, error: err.message, code: 'UPSTREAM_ERROR', upstreamStatus: err.upstreamStatus },
        { status: 502 },
      );
    }
    console.error('[/api/permits] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
