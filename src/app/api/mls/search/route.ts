import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Mirrors the shape expected by PropertyDiscovery.tsx */
interface PropertyResult {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  beds: number;
  baths: number;
  sqft: number;
  askingPrice: number;
  yearBuilt: number;
  imageUrl?: string;
}

/**
 * Escapes a string value for safe embedding in an OData $filter expression.
 * Single quotes are doubled; the string is percent-encoded per RESO convention.
 */
function oDataString(value: string): string {
  const escaped = value.replace(/'/g, "''");
  return `'${encodeURIComponent(escaped).replace(/'/g, '%27')}'`;
}

/**
 * GET /api/mls/search?q=<query>
 *
 * Proxies a typeahead search to the Bridge Interactive RESO API.
 * Searches UnparsedAddress, City, and PostalCode with OR logic.
 * Returns up to 8 simplified PropertyResult objects.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const { bridgeWorkerService } = await import('@/lib/services/bridgeWorkerService');
    if (await bridgeWorkerService.isPaused()) {
      return NextResponse.json(
        { error: 'MLS service is temporarily unavailable.' },
        { status: 503 }
      );
    }

    const apiClient = (await import('@/lib/apiClient')).default;

    const sv = oDataString(q);
    // ODataFilter only supports AND at the top level, so we hand-craft the OR clause here.
    const filter = `StandardStatus eq 'Active' and (contains(UnparsedAddress,${sv}) or contains(City,${sv}) or contains(PostalCode,${sv}))`;
    const select = [
      'ListingKey', 'ListingId', 'UnparsedAddress', 'FullAddress',
      'City', 'StateOrProvince', 'PostalCode',
      'BedroomsTotal', 'BathroomsFull', 'LivingArea',
      'ListPrice', 'YearBuilt', 'Media',
    ].join(',');

    const { data } = await apiClient.get(
      `Property?$top=8&$select=${select}&$filter=${filter}`
    );

    const raw: any[] = data?.value ?? [];

    const results: PropertyResult[] = raw.map((p) => ({
      id: p.ListingKey ?? p.ListingId ?? '',
      address: p.UnparsedAddress ?? p.FullAddress ?? '',
      city: p.City ?? '',
      state: p.StateOrProvince ?? '',
      zip: p.PostalCode ?? '',
      beds: p.BedroomsTotal ?? 0,
      baths: p.BathroomsFull ?? 0,
      sqft: p.LivingArea ?? 0,
      askingPrice: p.ListPrice ?? 0,
      yearBuilt: p.YearBuilt ?? 0,
      imageUrl: p.Media?.[0]?.MediaURL,
    }));

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('[MLS SEARCH] Query failed:', error?.message ?? error);
    return NextResponse.json(
      { error: 'Property search failed. Please try again.' },
      { status: 500 }
    );
  }
}
