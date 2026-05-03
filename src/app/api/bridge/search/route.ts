import { NextRequest, NextResponse } from 'next/server';
import type { BridgeSearchResult } from '@/types/bridge';

export const dynamic = 'force-dynamic';

export type { BridgeSearchResult };

/**
 * GET /api/bridge/search?q=123+Main+St
 *
 * Predictive property search backed by the Bridge Interactive OData API.
 * Returns up to 8 matching properties for autocomplete UI.
 * Falls back gracefully when Bridge credentials are not yet configured.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();

  if (!q || q.length < 3) {
    return NextResponse.json({ results: [] });
  }

  // Allowlist: only permit characters valid in a property address query.
  // Rejects OData operators, parentheses, and other injection vectors.
  if (!/^[\w\s,.\-#/]+$/i.test(q)) {
    return NextResponse.json({ results: [], error: 'Invalid search query' }, { status: 400 });
  }

  try {
    const { getApiClient } = await import('@/lib/apiClient');
    const { getBridgeConfig } = await import('@/config/bridge');

    const cfg = getBridgeConfig();
    const client = getApiClient();

    const vDatasetId = cfg.BRIDGE_VIRTUAL_DATASET_ID;
    const collection = `${vDatasetId}/Property`;

    // OData filter: case-insensitive contains on the address field
    const filter = `contains(tolower(UnparsedAddress),'${q.toLowerCase().replace(/'/g, "''")}')`;
    const select = [
      'ListingKey', 'ListingId', 'UnparsedAddress',
      'ListPrice', 'BedroomsTotal', 'BathroomsFull', 'LivingArea',
      'StandardStatus', 'Media',
    ].join(',');

    const response = await client.get(collection, {
      params: {
        '$filter': filter,
        '$select': select,
        '$top': 8,
        '$orderby': 'BridgeModificationTimestamp desc',
      },
    });

    const records: any[] = response.data?.value || [];

    const results: BridgeSearchResult[] = records.map((r) => ({
      listingKey: r.ListingKey ?? '',
      listingId: r.ListingId ?? '',
      address: r.UnparsedAddress ?? '',
      listPrice: r.ListPrice != null ? Number(r.ListPrice) : null,
      beds: r.BedroomsTotal != null ? Number(r.BedroomsTotal) : null,
      baths: r.BathroomsFull != null ? Number(r.BathroomsFull) : null,
      sqft: r.LivingArea != null ? Number(r.LivingArea) : null,
      standardStatus: r.StandardStatus ?? null,
      thumbnailUrl: Array.isArray(r.Media) && r.Media.length > 0
        ? (r.Media[0]?.MediaURL ?? null)
        : null,
    }));

    return NextResponse.json({ results });
  } catch (error: any) {
    const msg: string = error.message ?? '';
    const status: number | undefined = error.status;
    // Credentials missing, invalid, or not yet configured — degrade gracefully
    const isCredentialIssue =
      msg.includes('BRIDGE_CONFIG_FAILURE') ||
      msg.includes('Missing') ||
      msg.includes('access_token') ||
      msg.includes('Authentication Failure') ||
      status === 401 ||
      status === 403 ||
      msg.includes('401') ||
      msg.includes('403');
    if (isCredentialIssue) {
      return NextResponse.json({ results: [], credentialsMissing: true });
    }
    console.error('[BRIDGE SEARCH] Error:', msg);
    return NextResponse.json({ error: 'Search unavailable', results: [] }, { status: 502 });
  }
}
