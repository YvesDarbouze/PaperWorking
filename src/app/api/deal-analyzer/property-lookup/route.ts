import { NextRequest, NextResponse } from 'next/server';
import { getPropertyLookupProvider } from '@/lib/deal-analyzer/propertyLookup';

export const dynamic = 'force-dynamic';

/**
 * POST /api/deal-analyzer/property-lookup
 *
 * Optional address-first property data lookup layer (PROMPT 4).
 * Prefills public-record taxes, rent estimates, value estimates, and property facts.
 *
 * Body: { address: string }
 * Provider selected via PROPERTY_DATA_PROVIDER (default: mock).
 */
export async function POST(req: NextRequest) {
  try {
    const isE2E = req.cookies.get('__e2e_test')?.value === '1' || req.headers.get('x-e2e-test') === '1';
    const body = await req.json().catch(() => ({}));
    const { address } = body;

    if (!address || typeof address !== 'string' || !address.trim()) {
      return NextResponse.json(
        { success: false, error: 'Address string is required for lookup.' },
        { status: 400 }
      );
    }

    const provider = getPropertyLookupProvider(isE2E);
    const data = await provider.lookup(address);

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('[POST /api/deal-analyzer/property-lookup] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'We couldn\'t find data for this address — enter values manually.',
      },
      { status: 500 }
    );
  }
}
