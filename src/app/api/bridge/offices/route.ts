import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bridge/offices?q=<name>&key=<officeKey>
 *
 * Office directory search and lookup.
 * - ?q=Keller Williams → Typeahead search by office name
 * - ?key=abc123        → Direct lookup by OfficeKey
 * - ?key=abc123&agents=true → Fetch office + associated agents
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  const key = request.nextUrl.searchParams.get('key')?.trim();
  const includeAgents = request.nextUrl.searchParams.get('agents') === 'true';

  if (!q && !key) {
    return NextResponse.json(
      { error: 'Provide ?q=<name> for search or ?key=<officeKey> for lookup.' },
      { status: 400 }
    );
  }

  try {
    const { bridgeOfficeService } = await import('@/lib/services/bridgeOfficeService');

    // Direct lookup
    if (key) {
      const office = await bridgeOfficeService.getOffice(key);
      if (!office) {
        return NextResponse.json({ error: 'Office not found.' }, { status: 404 });
      }

      let agents = undefined;
      if (includeAgents) {
        agents = await bridgeOfficeService.getOfficeAgents(key);
      }

      return NextResponse.json({ office, agents });
    }

    // Typeahead search
    if (q && q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    if (q && !/^[\w\s.\-&']+$/i.test(q)) {
      return NextResponse.json({ results: [], error: 'Invalid search query' }, { status: 400 });
    }

    const results = await bridgeOfficeService.searchOffices(q!, 10);

    return NextResponse.json({
      results: results.map(o => ({
        officeKey: o.OfficeKey,
        name: o.OfficeName ?? '',
        phone: o.OfficePhone ?? null,
        email: o.OfficeEmail ?? null,
        address: [o.OfficeAddress1, o.OfficeCity, o.OfficeStateOrProvince, o.OfficePostalCode]
          .filter(Boolean)
          .join(', '),
        type: o.OfficeType ?? null,
        status: o.OfficeStatus ?? null,
      })),
    });
  } catch (error: any) {
    const msg = error?.message ?? '';
    if (msg.includes('BRIDGE_CONFIG_FAILURE') || msg.includes('BRIDGE_SERVICE_PAUSED')) {
      return NextResponse.json({ results: [], unavailable: true });
    }
    console.error('[BRIDGE OFFICES] Error:', msg);
    return NextResponse.json({ error: 'Office search unavailable.', results: [] }, { status: 502 });
  }
}
