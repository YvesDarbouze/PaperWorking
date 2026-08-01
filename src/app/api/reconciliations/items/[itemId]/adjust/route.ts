import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { BankReconciliationEngine } from '@/lib/accounting/reconciliationEngine';

export const dynamic = 'force-dynamic';

/**
 * POST /api/reconciliations/items/[itemId]/adjust
 * Adjusts a reconciliation item (creates transaction for BANK_ONLY, ignores for PW_ONLY, etc.).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  try {
    const { itemId } = await params;
    const body = await req.json().catch(() => ({}));
    const { amount, category, notes } = body;

    const period = await BankReconciliationEngine.adjustItem(itemId, {
      amount: amount !== undefined ? Number(amount) : undefined,
      category,
      notes,
    });

    return NextResponse.json({ success: true, period });
  } catch (error: any) {
    console.error('[POST /api/reconciliations/items/[itemId]/adjust] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
