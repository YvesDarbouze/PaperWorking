import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { prisma } from '@/lib/prisma';
import { sseEventBus } from '@/lib/events/eventBus';

/**
 * POST /api/financial-transactions/:id/approve
 *
 * Approves a transaction with its existing AI-suggested category.
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

  try {
    const ft = await prisma.financialTransaction.findUnique({
      where: { id },
    });

    if (!ft) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }

    const updated = await prisma.financialTransaction.update({
      where: { id },
      data: {
        status: 'MANUALLY_APPROVED',
        confidenceScore: 1.0,
        reviewedBy: uid,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      },
    });

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
    console.error(`[POST /api/financial-transactions/${id}/approve] Failed:`, msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
