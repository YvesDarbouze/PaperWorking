import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { BankReconciliationEngine } from '@/lib/accounting/reconciliationEngine';

export const dynamic = 'force-dynamic';

/**
 * POST /api/reconciliations/[periodId]/match
 * Triggers relaxed matching algorithm for unmatched items in the period.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ periodId: string }> }
): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  try {
    const { periodId } = await params;
    const period = await BankReconciliationEngine.matchItems(periodId);

    return NextResponse.json({ success: true, period });
  } catch (error: any) {
    console.error('[POST /api/reconciliations/[periodId]/match] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
