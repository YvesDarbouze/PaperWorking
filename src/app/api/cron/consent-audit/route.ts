import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FinancialNotificationService } from '@/lib/notifications/financialNotifications';

/**
 * GET/POST /api/cron/consent-audit
 *
 * Runs a weekly audit verifying that all active PlaidConnections have valid DTM consents.
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
    const activeConnections = await prisma.plaidConnection.findMany({
      where: { status: 'ACTIVE' },
    });

    let validCount = 0;
    let flaggedCount = 0;

    for (const conn of activeConnections) {
      const consentedProducts = (conn.consentedProducts as string[]) ?? [];
      const hasTransactions = consentedProducts.includes('transactions');
      const hasLiabilities =
        conn.connectionPurpose !== 'MORTGAGE_LIABILITY' || consentedProducts.includes('liabilities');

      if (!hasTransactions || !hasLiabilities) {
        flaggedCount++;
        await FinancialNotificationService.sendUrgentAlert({
          userId: conn.userId,
          projectId: conn.projectId,
          connectionId: conn.id,
          institutionName: conn.institutionName,
          reason: 'ADDITIONAL_CONSENT_REQUIRED',
        });
      } else {
        validCount++;
      }
    }

    return NextResponse.json({
      success: true,
      totalAudited: activeConnections.length,
      validCount,
      flaggedCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Cron /api/cron/consent-audit] Failed:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
