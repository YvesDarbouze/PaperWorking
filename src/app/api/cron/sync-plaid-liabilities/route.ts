import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBankingProvider } from '@/lib/banking';
import * as tokenVault from '@/lib/encryption/tokenVault';
import { Prisma } from '@prisma/client';

/**
 * GET/POST /api/cron/sync-plaid-liabilities
 *
 * Upgraded liabilities cron. Reads ACTIVE PlaidConnections (not BankConnections),
 * calls getLiabilities(), and:
 *   1. Upserts PlaidLiability records (Decimal precision, full Plaid payload)
 *   2. Creates a FinancialTransaction(MORTGAGE_ESCROW_PAYMENT) for the upcoming
 *      payment if nextPaymentDueDate is within the next 30 days and not already recorded.
 *
 * The legacy /api/cron/sync-liabilities (BankConnection → MortgageLiability) runs
 * in parallel — this new route does not replace it yet.
 *
 * Auth: CRON_SECRET (Authorization: Bearer header or x-cron-secret header)
 */

export const dynamic = 'force-dynamic';

function authGuard(req: NextRequest): NextResponse | null {
  const authHeader = req.headers.get('Authorization');
  const cronHeader = req.headers.get('CRON_SECRET') || req.headers.get('x-cron-secret');
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json({ success: false, error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if (authHeader !== `Bearer ${expected}` && cronHeader !== expected) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const guard = authGuard(req);
  if (guard) return guard;

  try {
    const bankingProvider = getBankingProvider();

    if (!bankingProvider.getLiabilities) {
      return NextResponse.json({ synced: 0, skipped: 0, message: 'Provider does not support liabilities' });
    }

    const connections = await prisma.plaidConnection.findMany({
      where: { status: 'ACTIVE' },
    });

    let synced = 0;
    let failures = 0;
    let skipped = 0;

    const now = new Date();
    const thirtyDaysOut = new Date(now.getTime() + 30 * 86400_000);

    for (const connection of connections) {
      try {
        const decryptedToken = tokenVault.decrypt(connection.accessToken);
        const liabilities = await bankingProvider.getLiabilities(decryptedToken);

        if (!liabilities.length) {
          skipped++;
          continue;
        }

        for (const liability of liabilities) {
          // Build raw payload for storage
          const rawLiabilityData = liability as unknown as Prisma.InputJsonValue;

          // 1. Upsert PlaidLiability
          const plaidLiability = await prisma.plaidLiability.upsert({
            where: {
              plaidConnectionId_accountId: {
                plaidConnectionId: connection.id,
                accountId: liability.accountId,
              },
            },
            update: {
              loanName: liability.lender ?? null,
              apr: liability.apr != null ? new Prisma.Decimal(liability.apr.toFixed(4)) : null,
              nextPaymentDueDate: liability.nextPaymentDueDate
                ? new Date(liability.nextPaymentDueDate)
                : null,
              nextPaymentAmount: liability.nextPaymentAmount != null
                ? new Prisma.Decimal(Math.abs(liability.nextPaymentAmount / 100).toFixed(2))
                : null,
              lastPaymentDate: liability.lastPaymentDate
                ? new Date(liability.lastPaymentDate)
                : null,
              lastPaymentAmount: liability.lastPaymentAmount != null
                ? new Prisma.Decimal(Math.abs(liability.lastPaymentAmount / 100).toFixed(2))
                : null,
              lastStatementBalance: new Prisma.Decimal(
                Math.abs(liability.balance / 100).toFixed(2)
              ),
              ytdInterestPaid: liability.ytdInterestPaid != null
                ? new Prisma.Decimal(Math.abs(liability.ytdInterestPaid / 100).toFixed(2))
                : null,
              escrowBalance: liability.escrowBalance != null
                ? new Prisma.Decimal(Math.abs(liability.escrowBalance / 100).toFixed(2))
                : null,
              rawLiabilityData,
              lastFetchedAt: now,
              projectId: connection.projectId ?? null,
            },
            create: {
              plaidConnectionId: connection.id,
              projectId: connection.projectId ?? null,
              liabilityType: 'MORTGAGE',
              accountId: liability.accountId,
              loanName: liability.lender ?? null,
              originationPrincipalAmount: liability.originalBalance != null
                ? new Prisma.Decimal(Math.abs(liability.originalBalance / 100).toFixed(2))
                : null,
              apr: liability.apr != null ? new Prisma.Decimal(liability.apr.toFixed(4)) : null,
              nextPaymentDueDate: liability.nextPaymentDueDate
                ? new Date(liability.nextPaymentDueDate)
                : null,
              nextPaymentAmount: liability.nextPaymentAmount != null
                ? new Prisma.Decimal(Math.abs(liability.nextPaymentAmount / 100).toFixed(2))
                : null,
              lastPaymentDate: liability.lastPaymentDate
                ? new Date(liability.lastPaymentDate)
                : null,
              lastPaymentAmount: liability.lastPaymentAmount != null
                ? new Prisma.Decimal(Math.abs(liability.lastPaymentAmount / 100).toFixed(2))
                : null,
              lastStatementBalance: new Prisma.Decimal(
                Math.abs(liability.balance / 100).toFixed(2)
              ),
              ytdInterestPaid: liability.ytdInterestPaid != null
                ? new Prisma.Decimal(Math.abs(liability.ytdInterestPaid / 100).toFixed(2))
                : null,
              escrowBalance: liability.escrowBalance != null
                ? new Prisma.Decimal(Math.abs(liability.escrowBalance / 100).toFixed(2))
                : null,
              rawLiabilityData,
              lastFetchedAt: now,
            },
          });

          // 2. Create a forecasted FinancialTransaction for the upcoming mortgage payment
          //    if nextPaymentDueDate is within 30 days and not already created.
          if (
            plaidLiability.nextPaymentDueDate &&
            plaidLiability.nextPaymentDueDate <= thirtyDaysOut &&
            plaidLiability.nextPaymentAmount &&
            connection.projectId
          ) {
            const dueDate = plaidLiability.nextPaymentDueDate;
            const paymentAmount = plaidLiability.nextPaymentAmount;
            const payee = plaidLiability.loanName ?? 'Mortgage Payment';

            // Idempotency: check if we already recorded this payment date
            const existing = await prisma.financialTransaction.findFirst({
              where: {
                plaidLiabilityId: plaidLiability.id,
                transactionDate: dueDate,
                source: 'PLAID_LIABILITIES',
              },
            });

            if (!existing) {
              await prisma.financialTransaction.create({
                data: {
                  projectId: connection.projectId,
                  userId: connection.userId,
                  source: 'PLAID_LIABILITIES',
                  plaidLiabilityId: plaidLiability.id,
                  amount: paymentAmount,
                  direction: 'DEBIT',
                  transactionDate: dueDate,
                  payee,
                  description: `Mortgage payment due ${dueDate.toLocaleDateString('en-US')}`,
                  category: 'MORTGAGE_ESCROW_PAYMENT',
                  status: 'PENDING_REVIEW',
                  taxTreatment: 'LIABILITY',
                },
              });
            }
          }
        }

        synced++;
      } catch (err: any) {
        failures++;
        console.error(`[SyncPlaidLiabilities] Failed for connection ${connection.id}:`, err.message);
      }
    }

    // PostHog telemetry
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (posthogKey && synced > 0) {
      fetch('https://app.posthog.com/capture/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: posthogKey,
          event: 'plaid_liabilities_synced_v2',
          distinct_id: 'system',
          properties: { synced, failures, skipped },
        }),
      }).catch(() => {/* ignore */});
    }

    return NextResponse.json({ synced, failures, skipped });
  } catch (error: any) {
    console.error('[SyncPlaidLiabilities] Fatal:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
