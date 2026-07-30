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
  { params }: { params: { ruleId: string } }
): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { ruleId } = params;
  if (!ruleId) {
    return NextResponse.json({ success: false, error: 'ruleId is required' }, { status: 400 });
  }

  try {
    const result = await TransactionRuleEngine.applyRule(ruleId);
    return NextResponse.json({ success: true, ruleId, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[POST /api/rules/${ruleId}/apply] Failed:`, msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
