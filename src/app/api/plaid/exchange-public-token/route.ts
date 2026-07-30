import { NextRequest } from 'next/server';
import { POST as exchangeV2POST } from '../exchange-v2/route';

/**
 * POST /api/plaid/exchange-public-token
 * Alias route for /api/plaid/exchange-v2
 */
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  return exchangeV2POST(req);
}
