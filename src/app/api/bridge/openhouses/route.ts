import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bridge/openhouses?listingKey=<key>&top=<n>
 *
 * Upcoming open house events.
 * - No params    → All upcoming open houses (next 20)
 * - ?listingKey=abc → Open houses for a specific property
 * - ?top=50      → Control result count
 * - ?key=xyz     → Single open house lookup by OpenHouseKey
 */
export async function GET(request: NextRequest) {
  const listingKey = request.nextUrl.searchParams.get('listingKey')?.trim();
  const key = request.nextUrl.searchParams.get('key')?.trim();
  const top = Math.min(parseInt(request.nextUrl.searchParams.get('top') ?? '20', 10), 100);

  try {
    const { bridgeOpenHouseService } = await import('@/lib/services/bridgeOpenHouseService');

    // Direct lookup by OpenHouseKey
    if (key) {
      const openHouse = await bridgeOpenHouseService.getOpenHouse(key);
      if (!openHouse) {
        return NextResponse.json({ error: 'Open house not found.' }, { status: 404 });
      }
      return NextResponse.json({ openHouse });
    }

    // Fetch upcoming (optionally filtered by listing)
    const results = await bridgeOpenHouseService.getUpcoming(top, listingKey ?? undefined);

    return NextResponse.json({
      results: results.map(oh => ({
        openHouseKey: oh.OpenHouseKey,
        listingKey: oh.ListingKey ?? null,
        listingId: oh.ListingId ?? null,
        date: oh.OpenHouseDate ?? null,
        startTime: oh.OpenHouseStartTime ?? null,
        endTime: oh.OpenHouseEndTime ?? null,
        type: oh.OpenHouseType ?? null,
        remarks: oh.OpenHouseRemarks ?? null,
        showingAgent: oh.ShowingAgentFirstName
          ? `${oh.ShowingAgentFirstName} ${oh.ShowingAgentLastName ?? ''}`.trim()
          : null,
      })),
    });
  } catch (error: any) {
    const msg = error?.message ?? '';
    if (msg.includes('BRIDGE_CONFIG_FAILURE') || msg.includes('BRIDGE_SERVICE_PAUSED')) {
      return NextResponse.json({ results: [], unavailable: true });
    }
    console.error('[BRIDGE OPENHOUSES] Error:', msg);
    return NextResponse.json({ error: 'Open house search unavailable.', results: [] }, { status: 502 });
  }
}
