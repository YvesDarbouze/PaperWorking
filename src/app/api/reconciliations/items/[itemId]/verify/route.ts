import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { BankReconciliationEngine } from '@/lib/accounting/reconciliationEngine';

export const dynamic = 'force-dynamic';

/**
 * POST /api/reconciliations/items/[itemId]/verify
 * Marks a reconciliation item as VERIFIED.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const { uid } = auth;

  try {
    const { itemId } = await params;
    const body = await req.json().catch(() => ({}));
    const { notes } = body;

    const period = await BankReconciliationEngine.verifyItem(itemId, uid, notes);

    return NextResponse.json({ success: true, period });
  } catch (error: any) {
    console.error('[POST /api/reconciliations/items/[itemId]/verify] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
