import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { prisma } from '@/lib/prisma';
import { TransactionIdentificationEngine } from '@/lib/banking/transactionIdentificationEngine';

/**
 * POST /api/transactions/:id/identify
 *
 * Runs the TransactionIdentificationEngine on a specific PlaidRawTransaction or FinancialTransaction ID.
 * Updates the database record with the new classification and returns the IdentificationResult.
 *
 * Auth: Firebase ID token via Authorization: Bearer header
 */
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { id } = params;
  if (!id) {
    return NextResponse.json({ success: false, error: 'Transaction ID is required' }, { status: 400 });
  }

  try {
    // 1. Fetch raw transaction or financial transaction
    let rawTx = await prisma.plaidRawTransaction.findUnique({
      where: { id },
    });

    if (!rawTx) {
      // Try by plaidTransactionId
      rawTx = await prisma.plaidRawTransaction.findUnique({
        where: { plaidTransactionId: id },
      });
    }

    if (!rawTx) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }

    // 2. Fetch associated connection for projectId
    const conn = await prisma.plaidConnection.findUnique({
      where: { id: rawTx.plaidConnectionId },
    });

    // 3. Run identification engine
    const result = await TransactionIdentificationEngine.identify(
      {
        name: rawTx.name,
        amount: Number(rawTx.amount),
        category: rawTx.category,
        personalFinanceCategory: rawTx.personalFinanceCategory as any,
        postedDate: rawTx.postedDate,
        merchantName: rawTx.merchantName,
        direction: rawTx.direction,
      },
      conn?.projectId ?? undefined
    );

    // 4. Update FinancialTransaction if exists
    const ft = await prisma.financialTransaction.findFirst({
      where: { plaidTransactionId: rawTx.id },
    });

    if (ft) {
      await prisma.financialTransaction.update({
        where: { id: ft.id },
        data: {
          category: result.paperWorkingCategory,
          confidenceScore: result.confidenceScore,
          status: result.confidenceScore >= 0.85 ? 'AUTO_APPROVED' : 'PENDING_REVIEW',
          matchedLeaseId: result.suggestedLeaseId ?? null,
          isRecurring: result.isRecurring,
          isSplit: result.isSplitSuggested,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      transactionId: id,
      result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[POST /api/transactions/${id}/identify] Failed:`, msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
