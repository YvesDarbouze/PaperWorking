import { NextResponse } from 'next/server';
import { getMarketScoreboardData } from '@/lib/market/market-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getMarketScoreboardData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[api/market/tickers] Failed to fetch market scoreboard data:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve macroeconomic and local market scoreboard' },
      { status: 500 }
    );
  }
}
