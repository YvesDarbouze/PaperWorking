import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bridge/agents?q=<name>&key=<memberKey>
 *
 * Agent search and profile endpoint.
 * - ?q=John Smith → Typeahead search by name
 * - ?key=abc123   → Direct lookup by MemberKey
 * - ?key=abc123&listings=true → Fetch agent + their active listings
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  const key = request.nextUrl.searchParams.get('key')?.trim();
  const includeListings = request.nextUrl.searchParams.get('listings') === 'true';

  if (!q && !key) {
    return NextResponse.json(
      { error: 'Provide ?q=<name> for search or ?key=<memberKey> for lookup.' },
      { status: 400 }
    );
  }

  try {
    const { bridgeAgentService } = await import('@/lib/services/bridgeAgentService');

    // Direct lookup by MemberKey
    if (key) {
      const agent = await bridgeAgentService.getAgent(key);
      if (!agent) {
        return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });
      }

      let listings = undefined;
      if (includeListings) {
        listings = await bridgeAgentService.getAgentListings(key);
      }

      return NextResponse.json({ agent, listings });
    }

    // Typeahead search
    if (q && q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Allowlist: names only
    if (q && !/^[\w\s.\-']+$/i.test(q)) {
      return NextResponse.json({ results: [], error: 'Invalid search query' }, { status: 400 });
    }

    const results = await bridgeAgentService.searchAgents(q!, 10);

    return NextResponse.json({
      results: results.map(a => ({
        memberKey: a.MemberKey,
        name: a.MemberFullName ?? `${a.MemberFirstName ?? ''} ${a.MemberLastName ?? ''}`.trim(),
        email: a.MemberEmail ?? null,
        phone: a.MemberDirectPhone ?? a.MemberMobilePhone ?? null,
        license: a.MemberStateLicense ?? null,
        officeName: a.OfficeName ?? null,
        photoUrl: a.Media?.[0]?.MediaURL ?? null,
      })),
    });
  } catch (error: any) {
    const msg = error?.message ?? '';
    if (msg.includes('BRIDGE_CONFIG_FAILURE') || msg.includes('BRIDGE_SERVICE_PAUSED')) {
      return NextResponse.json({ results: [], unavailable: true });
    }
    console.error('[BRIDGE AGENTS] Error:', msg);
    return NextResponse.json({ error: 'Agent search unavailable.', results: [] }, { status: 502 });
  }
}
