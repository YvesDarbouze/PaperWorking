import { NextRequest, NextResponse } from 'next/server';
import { DailySyncOrchestrator } from '@/lib/banking/dailySyncOrchestrator';

/**
 * GET/POST /api/cron/daily-sync
 *
 * Triggers the 6-hour financial sync across all active PlaidConnections.
 * Auth: Authorization: Bearer <CRON_SECRET> or CRON_SECRET / x-cron-secret header.
 */
export const dynamic = 'force-dynamic';

function isCronAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('Authorization');
  const cronHeader = req.headers.get('CRON_SECRET') || req.headers.get('x-cron-secret');
  const expected = process.env.CRON_SECRET || process.env.WORKER_SECRET;

  if (!expected) return true; // dev mode fallback
  return authHeader === `Bearer ${expected}` || cronHeader === expected;
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await DailySyncOrchestrator.runScheduledSync();
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Cron /api/cron/daily-sync] Failed:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
