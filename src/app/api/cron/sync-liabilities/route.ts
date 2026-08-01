import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getBankingProvider } from '@/lib/banking';
import * as tokenVault from '@/lib/encryption/tokenVault';

/**
 * GET/POST /api/cron/sync-liabilities
 *
 * Syncs mortgage/liability data for all active BankConnections that support
 * the Liabilities Plaid product. Scheduled every 6 hours via Cloud Scheduler.
 *
 * Auth: CRON_SECRET (Authorization: Bearer header or CRON_SECRET / x-cron-secret header)
 * No Firebase token expected — this is a server-to-server cron call.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  const cronSecretHeader = req.headers.get('CRON_SECRET') || req.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      { success: false, error: 'CRON_SECRET is not configured on the server.' },
      { status: 500 }
    );
  }

  const isAuthValid =
    authHeader === `Bearer ${expectedSecret}` || cronSecretHeader === expectedSecret;

  if (!isAuthValid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const bankingProvider = getBankingProvider();

    // Only process connections that are active
    const connections = await prisma.bankConnection.findMany({
      where: { status: 'active' },
    });

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    for (const connection of connections) {
      try {
        // Skip if provider does not support liabilities
        if (!bankingProvider.getLiabilities) {
          skippedCount++;
          continue;
        }

        const decryptedToken = tokenVault.decrypt(connection.accessToken);
        const liabilities = await bankingProvider.getLiabilities(decryptedToken);

        // Upsert each mortgage liability record
        for (const liability of liabilities) {
          await prisma.mortgageLiability.upsert({
            where: {
              // Unique on connectionId + accountId
              connectionId_accountId: {
                connectionId: connection.id,
                accountId: liability.accountId,
              },
            },
            update: {
              lender: liability.lender,
              balance: BigInt(liability.balance),
              originalBalance: liability.originalBalance != null ? BigInt(liability.originalBalance) : null,
              interestRatePct: liability.interestRatePct,
              apr: liability.apr,
              nextPaymentDueDate: liability.nextPaymentDueDate ? new Date(liability.nextPaymentDueDate) : null,
              nextPaymentAmount: liability.nextPaymentAmount != null ? BigInt(liability.nextPaymentAmount) : null,
              ytdInterestPaid: liability.ytdInterestPaid != null ? BigInt(liability.ytdInterestPaid) : null,
              escrowBalance: liability.escrowBalance != null ? BigInt(liability.escrowBalance) : null,
              lastPaymentAmount: liability.lastPaymentAmount != null ? BigInt(liability.lastPaymentAmount) : null,
              lastPaymentDate: liability.lastPaymentDate ? new Date(liability.lastPaymentDate) : null,
              fetchedAt: new Date(),
            },
            create: {
              connectionId: connection.id,
              accountId: liability.accountId,
              lender: liability.lender,
              balance: BigInt(liability.balance),
              originalBalance: liability.originalBalance != null ? BigInt(liability.originalBalance) : null,
              interestRatePct: liability.interestRatePct,
              apr: liability.apr,
              nextPaymentDueDate: liability.nextPaymentDueDate ? new Date(liability.nextPaymentDueDate) : null,
              nextPaymentAmount: liability.nextPaymentAmount != null ? BigInt(liability.nextPaymentAmount) : null,
              ytdInterestPaid: liability.ytdInterestPaid != null ? BigInt(liability.ytdInterestPaid) : null,
              escrowBalance: liability.escrowBalance != null ? BigInt(liability.escrowBalance) : null,
              lastPaymentAmount: liability.lastPaymentAmount != null ? BigInt(liability.lastPaymentAmount) : null,
              lastPaymentDate: liability.lastPaymentDate ? new Date(liability.lastPaymentDate) : null,
            },
          });
        }

        // Fire-and-forget PostHog telemetry
        const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
        if (posthogKey && liabilities.length > 0) {
          fetch('https://app.posthog.com/capture/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: posthogKey,
              event: 'mortgage_data_synced',
              distinct_id: connection.userId,
              properties: {
                connectionId: connection.id,
                mortgageCount: liabilities.length,
              },
            }),
          }).catch(() => {/* ignore */});
        }

        successCount++;
      } catch (err: any) {
        failCount++;
        console.error(`[Liabilities Sync Cron] Failed for connection ${connection.id}:`, err);
      }
    }

    return NextResponse.json({
      synced: successCount,
      failures: failCount,
      skipped: skippedCount,
    });
  } catch (error: any) {
    console.error('[Liabilities Sync Cron] Fatal Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
