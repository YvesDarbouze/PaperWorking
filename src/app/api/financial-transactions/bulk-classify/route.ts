import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { prisma } from '@/lib/prisma';
import { FinancialTransactionCategory } from '@prisma/client';
import { sseEventBus } from '@/lib/events/eventBus';

/**
 * POST /api/financial-transactions/bulk-classify
 *
 * Classifies and approves multiple selected transactions in a single batch.
 *
 * Body:
 *   ids: string[]
 *   category: FinancialTransactionCategory
 *   createRule?: boolean
 *
 * Auth: Firebase ID token via Authorization: Bearer header
 */
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { uid } = auth;

  let body: {
    ids?: string[];
    category?: FinancialTransactionCategory;
    createRule?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { ids, category } = body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ success: false, error: 'ids array is required' }, { status: 400 });
  }

  if (!category) {
    return NextResponse.json({ success: false, error: 'category is required' }, { status: 400 });
  }

  try {
    const result = await prisma.financialTransaction.updateMany({
      where: { id: { in: ids } },
      data: {
        category,
        status: 'MANUALLY_APPROVED',
        confidenceScore: 1.0,
        reviewedBy: uid,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Get sample transaction to emit SSE for project
    const sample = await prisma.financialTransaction.findFirst({
      where: { id: ids[0] },
      select: { projectId: true },
    });

    if (sample?.projectId) {
      sseEventBus.emit(`transactions:approved:${sample.projectId}`, {
        count: result.count,
        timestamp: new Date().toISOString(),
      });
      sseEventBus.emit(`kpi:updated:${sample.projectId}`, {
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/financial-transactions/bulk-classify] Failed:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
