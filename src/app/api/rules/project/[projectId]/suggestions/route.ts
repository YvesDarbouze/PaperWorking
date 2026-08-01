import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { TransactionRuleEngine } from '@/lib/banking/transactionRuleEngine';

/**
 * GET /api/rules/:projectId/suggestions
 *
 * Returns smart pattern-based rule suggestions for a project.
 *
 * Auth: Firebase ID token via Authorization: Bearer header
 */
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { projectId } = params;
  if (!projectId) {
    return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
  }

  try {
    const suggestions = await TransactionRuleEngine.generateSuggestions(projectId);
    return NextResponse.json({
      success: true,
      projectId,
      count: suggestions.length,
      suggestions,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[GET /api/rules/${projectId}/suggestions] Failed:`, msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
