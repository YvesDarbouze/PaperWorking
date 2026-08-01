import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { prisma } from '@/lib/prisma';
import { TransactionIdentificationEngine } from '@/lib/banking/transactionIdentificationEngine';

/**
 * GET /api/transactions/:projectId/identification-suggestions
 *
 * Retrieves all transactions in PENDING_REVIEW status for a project,
 * runs the TransactionIdentificationEngine on each, and returns suggestions.
 *
 * Auth: Firebase ID token via Authorization: Bearer header
 */
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { projectId } = params;
  if (!projectId) {
    return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
  }

  try {
    // Fetch all PENDING_REVIEW transactions for this project
    const pendingTransactions = await prisma.financialTransaction.findMany({
      where: {
        projectId,
        status: 'PENDING_REVIEW',
      },
      include: {
        plaidTransaction: true,
      },
      orderBy: { transactionDate: 'desc' },
      take: 50,
    });

    const suggestions = await Promise.all(
      pendingTransactions.map(async (ft) => {
        const rawTx = ft.plaidTransaction;
        const identification = await TransactionIdentificationEngine.identify(
          {
            name: rawTx?.name ?? ft.description ?? ft.payee,
            amount: Number(ft.amount),
            category: rawTx?.category ?? [],
            personalFinanceCategory: rawTx?.personalFinanceCategory as any,
            postedDate: ft.transactionDate,
            merchantName: rawTx?.merchantName ?? ft.payee,
            direction: ft.direction,
          },
          projectId
        );

        return {
          financialTransactionId: ft.id,
          date: ft.transactionDate.toISOString(),
          payee: ft.payee,
          amount: Number(ft.amount),
          direction: ft.direction,
          currentCategory: ft.category,
          identification,
        };
      })
    );

    return NextResponse.json({
      success: true,
      projectId,
      count: suggestions.length,
      suggestions,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[GET /api/transactions/${projectId}/identification-suggestions] Failed:`, msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
