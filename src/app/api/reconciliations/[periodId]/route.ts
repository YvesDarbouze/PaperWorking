import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reconciliations/[periodId]
 * Fetches a single reconciliation period by ID with all items.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ periodId: string }> }
): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  try {
    const { periodId } = await params;

    const period = await prisma.reconciliationPeriod.findUnique({
      where: { id: periodId },
      include: {
        items: {
          include: {
            financialTransaction: true,
            plaidTransaction: true,
          },
          orderBy: { date: 'asc' },
        },
        project: true,
        reconciler: { select: { id: true, name: true, email: true } },
      },
    });

    if (!period) {
      return NextResponse.json(
        { success: false, error: 'Reconciliation period not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, period });
  } catch (error: any) {
    console.error('[GET /api/reconciliations/[periodId]] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
