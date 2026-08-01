import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBankingProvider } from '@/lib/banking';
import * as tokenVault from '@/lib/encryption/tokenVault';
import { classifyTransaction } from '@/lib/banking/classifier';
import { bridgeCategory, normalizeAmount } from '@/lib/banking/categoryBridge';
import { Prisma } from '@prisma/client';

/**
 * GET/POST /api/cron/sync-financial-transactions
 *
 * Reads all ACTIVE PlaidConnections, syncs via Plaid /transactions/sync,
 * upserts PlaidRawTransaction records, and writes to the unified
 * FinancialTransaction ledger via the categoryBridge.
 *
 * This is the NEW pipeline. The legacy /api/cron/sync-transactions route
 * (BankConnection → Transaction) continues to run in parallel until cut-over.
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

    const connections = await prisma.plaidConnection.findMany({
      where: { status: 'ACTIVE' },
    });

    let synced = 0;
    let failures = 0;
    let rawUpserted = 0;
    let ledgerUpserted = 0;

    for (const connection of connections) {
      try {
        const decryptedToken = tokenVault.decrypt(connection.accessToken);

        let cursor = connection.lastSyncCursor ?? undefined;
        let hasMore = true;

        while (hasMore) {
          const result = await bankingProvider.getTransactions({
            accessToken: decryptedToken,
            startDate: new Date(Date.now() - 7 * 86400_000).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            cursor,
          });

          // ── Added / Modified ─────────────────────────────────────────────
          for (const tx of [...result.added, ...result.modified]) {
            const classified = classifyTransaction(tx.name);
            const { absoluteAmount, direction } = normalizeAmount(tx.amount);
            const bridge = bridgeCategory(classified.reiCategory, tx.amount);

            // 1. Upsert PlaidRawTransaction (write-only sink)
            const raw = await prisma.plaidRawTransaction.upsert({
              where: { plaidTransactionId: tx.plaidId },
              update: {
                rawPlaidData: tx as unknown as Prisma.InputJsonValue,
                amount: new Prisma.Decimal(absoluteAmount),
                direction,
                name: tx.name,
                merchantName: tx.merchantName ?? null,
                pending: tx.pending,
                category: tx.category,
                postedDate: tx.date,
                removed: false,
                updatedAt: new Date(),
              },
              create: {
                plaidConnectionId: connection.id,
                plaidTransactionId: tx.plaidId,
                plaidAccountId: tx.accountId,
                rawPlaidData: tx as unknown as Prisma.InputJsonValue,
                amount: new Prisma.Decimal(absoluteAmount),
                direction,
                name: tx.name,
                merchantName: tx.merchantName ?? null,
                pending: tx.pending,
                category: tx.category,
                postedDate: tx.date,
              },
            });
            rawUpserted++;

            // 2. Upsert FinancialTransaction ledger entry
            await prisma.financialTransaction.upsert({
              where: { plaidTransactionId: raw.id },
              update: {
                amount: new Prisma.Decimal(absoluteAmount),
                direction: bridge.direction,
                transactionDate: tx.date,
                postedDate: tx.pending ? null : tx.date,
                payee: tx.merchantName ?? tx.name,
                description: tx.name,
                category: bridge.category,
                status: tx.pending ? 'PENDING_REVIEW' : 'AUTO_APPROVED',
                confidenceScore: classified.confidence,
              },
              create: {
                projectId: connection.projectId ?? '',
                userId: connection.userId,
                source: 'PLAID_TRANSACTIONS',
                plaidTransactionId: raw.id,
                amount: new Prisma.Decimal(absoluteAmount),
                direction: bridge.direction,
                transactionDate: tx.date,
                postedDate: tx.pending ? null : tx.date,
                payee: tx.merchantName ?? tx.name,
                description: tx.name,
                category: bridge.category,
                status: tx.pending ? 'PENDING_REVIEW' : 'AUTO_APPROVED',
                confidenceScore: classified.confidence,
                ...(bridge.taxTreatment ? { taxTreatment: bridge.taxTreatment as any } : {}),
              },
            });
            ledgerUpserted++;
          }

          // ── Removed ──────────────────────────────────────────────────────
          for (const plaidId of result.removed) {
            try {
              await prisma.plaidRawTransaction.update({
                where: { plaidTransactionId: plaidId },
                data: { removed: true, updatedAt: new Date() },
              });
            } catch {
              // already removed or never synced — skip
            }
          }

          cursor = result.nextCursor;
          hasMore = result.hasMore;
        }

        // Mark connection sync success
        await prisma.plaidConnection.update({
          where: { id: connection.id },
          data: {
            lastSyncCursor: cursor,
            lastSyncAt: new Date(),
            lastSuccessfulSyncAt: new Date(),
            syncErrorCount: 0,
            lastSyncErrorMessage: null,
            status: 'ACTIVE',
          },
        });

        synced++;
      } catch (err: any) {
        failures++;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[SyncFinancialTransactions] Failed for connection ${connection.id}:`, msg);

        await prisma.plaidConnection.update({
          where: { id: connection.id },
          data: {
            syncErrorCount: { increment: 1 },
            lastSyncErrorMessage: msg.slice(0, 500),
            ...(msg.includes('ITEM_LOGIN_REQUIRED') || msg.includes('item_login_required')
              ? { status: 'ERROR' }
              : {}),
          },
        });
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
          event: 'financial_transactions_synced',
          distinct_id: 'system',
          properties: { synced, failures, rawUpserted, ledgerUpserted },
        }),
      }).catch(() => {/* ignore */});
    }

    return NextResponse.json({ synced, failures, rawUpserted, ledgerUpserted });
  } catch (error: any) {
    console.error('[SyncFinancialTransactions] Fatal:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
