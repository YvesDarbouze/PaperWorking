import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { BankReconciliationEngine } from '@/lib/accounting/reconciliationEngine';

export const dynamic = 'force-dynamic';

/**
 * POST /api/reconciliations/[periodId]/finalize
 * Finalizes the reconciliation period.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ periodId: string }> }
): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const { uid } = auth;

  try {
    const { periodId } = await params;
    const body = await req.json().catch(() => ({}));
    const { notes } = body;

    const period = await BankReconciliationEngine.finalizeReconciliation(periodId, uid, notes);

    return NextResponse.json({ success: true, period });
  } catch (error: any) {
    console.error('[POST /api/reconciliations/[periodId]/finalize] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 400 }
    );
  }
}
