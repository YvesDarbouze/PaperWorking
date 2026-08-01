import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { BankReconciliationEngine } from '@/lib/accounting/reconciliationEngine';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/reconciliations
 * Starts or fetches a Bank Reconciliation period.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const { uid } = auth;

  try {
    const body = await req.json();
    const { projectId, month, year, bankStatementBalance } = body;

    if (!projectId || !month || !year) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: projectId, month, year' },
        { status: 400 }
      );
    }

    const period = await BankReconciliationEngine.startReconciliation(
      projectId,
      Number(month),
      Number(year),
      uid,
      bankStatementBalance !== undefined ? Number(bankStatementBalance) : undefined
    );

    return NextResponse.json({ success: true, period });
  } catch (error: any) {
    console.error('[POST /api/reconciliations] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reconciliations
 * Lists reconciliation periods for a project or filters by status/month/year.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const status = searchParams.get('status');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId query parameter is required' },
        { status: 400 }
      );
    }

    const where: any = { projectId };
    if (month) where.month = Number(month);
    if (year) where.year = Number(year);
    if (status) where.status = status;

    const periods = await prisma.reconciliationPeriod.findMany({
      where,
      include: {
        _count: { select: { items: true } },
        reconciler: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return NextResponse.json({ success: true, periods });
  } catch (error: any) {
    console.error('[GET /api/reconciliations] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
