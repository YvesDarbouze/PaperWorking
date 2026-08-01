import { NextRequest, NextResponse } from 'next/server';
import { DailySyncOrchestrator } from '@/lib/banking/dailySyncOrchestrator';

/**
 * GET/POST /api/cron/retry-failed-connections
 *
 * Retries failed Plaid connections every 2 hours.
 * Auth: Authorization: Bearer <CRON_SECRET> or CRON_SECRET / x-cron-secret header.
 */
export const dynamic = 'force-dynamic';

function isCronAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('Authorization');
  const cronHeader = req.headers.get('CRON_SECRET') || req.headers.get('x-cron-secret');
  const expected = process.env.CRON_SECRET || process.env.WORKER_SECRET;

  if (!expected) return true;
  return authHeader === `Bearer ${expected}` || cronHeader === expected;
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const retriedCount = await DailySyncOrchestrator.retryFailedConnections();
    return NextResponse.json({ success: true, retriedCount });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Cron /api/cron/retry-failed-connections] Failed:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
