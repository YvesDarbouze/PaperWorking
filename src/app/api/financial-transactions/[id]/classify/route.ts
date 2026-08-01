import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { prisma } from '@/lib/prisma';
import { FinancialTransactionCategory } from '@prisma/client';
import { sseEventBus } from '@/lib/events/eventBus';

/**
 * POST /api/financial-transactions/:id/classify
 *
 * Classifies a financial transaction with human selection/approval.
 * Supports multi-line split allocation and rule creation.
 *
 * Body:
 *   category: FinancialTransactionCategory
 *   matchedLeaseId?: string
 *   notes?: string
 *   isSplit?: boolean
 *   splits?: Array<{ amount: number; category: FinancialTransactionCategory; reason: string }>
 *   createRule?: boolean
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

  const { uid } = auth;
  const { id } = params;
  if (!id) {
    return NextResponse.json({ success: false, error: 'Transaction ID is required' }, { status: 400 });
  }

  let body: {
    category?: FinancialTransactionCategory;
    matchedLeaseId?: string;
    notes?: string;
    isSplit?: boolean;
    splits?: Array<{ amount: number; category: FinancialTransactionCategory; reason: string }>;
    createRule?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { category, matchedLeaseId, notes, isSplit, splits, createRule } = body;

  if (!category && (!isSplit || !splits?.length)) {
    return NextResponse.json({ success: false, error: 'Category or valid splits required' }, { status: 400 });
  }

  try {
    const ft = await prisma.financialTransaction.findUnique({
      where: { id },
    });

    if (!ft) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }

    // Validate splits if present
    if (isSplit && splits?.length) {
      const splitSum = splits.reduce((sum, s) => sum + Math.abs(s.amount), 0);
      const originalAmt = Math.abs(Number(ft.amount));
      if (Math.abs(splitSum - originalAmt) > 0.05) {
        return NextResponse.json(
          {
            success: false,
            error: `Splits sum ($${splitSum.toFixed(2)}) must equal original transaction amount ($${originalAmt.toFixed(2)})`,
          },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.financialTransaction.update({
      where: { id },
      data: {
        category: category ?? ft.category,
        status: 'MANUALLY_APPROVED',
        confidenceScore: 1.0,
        reviewedBy: uid,
        reviewedAt: new Date(),
        matchedLeaseId: matchedLeaseId ?? ft.matchedLeaseId,
        notes: notes ?? ft.notes,
        isSplit: !!isSplit,
        updatedAt: new Date(),
      },
    });

    // Optionally create auto-approval rule for future matches
    if (createRule && ft.payee) {
      await prisma.transactionRule.create({
        data: {
          userId: uid,
          projectId: ft.projectId,
          name: `Auto-approve ${ft.payee}`,
          ruleType: 'PLAID_AUTO_CATEGORIZE',
          conditions: [
            { field: 'PAYEE_NAME', operator: 'CONTAINS', value: ft.payee },
          ],
          action: {
            category: category ?? ft.category,
            autoApprove: true,
          },
        },
      }).catch((ruleErr) => {
        console.warn('[classify] Failed to create rule (non-fatal):', ruleErr);
      });
    }

    // Emit SSE event for real-time KPI recalculation
    sseEventBus.emit(`transactions:approved:${ft.projectId}`, {
      count: 1,
      timestamp: new Date().toISOString(),
    });
    sseEventBus.emit(`kpi:updated:${ft.projectId}`, {
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      transaction: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[POST /api/financial-transactions/${id}/classify] Failed:`, msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
