import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { TransactionRuleEngine } from '@/lib/banking/transactionRuleEngine';

/**
 * POST /api/rules/:ruleId/apply
 *
 * Manually triggers a rule application against all PENDING_REVIEW transactions in the project.
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
    return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
  }

  try {
    const result = await TransactionRuleEngine.applyRule(id);
    return NextResponse.json({ success: true, id, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[POST /api/rules/${id}/apply] Failed:`, msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
