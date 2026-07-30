import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { prisma } from '@/lib/prisma';
import { RulesEngine } from '@/lib/banking/rulesEngine';

/**
 * POST /api/rules
 *
 * Creates a new transaction rule for automated classification and immediately applies it to pending transactions.
 *
 * Auth: Firebase ID token via Authorization: Bearer header
 */
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { uid } = auth;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { projectId, name, ruleType, conditions, action, priority } = body as {
    projectId?: string;
    name?: string;
    ruleType?: string;
    conditions?: unknown;
    action?: unknown;
    priority?: number;
  };

  if (!projectId || !name || !conditions || !action) {
    return NextResponse.json(
      { success: false, error: 'projectId, name, conditions, and action are required' },
      { status: 400 }
    );
  }

  try {
    const rule = await prisma.transactionRule.create({
      data: {
        userId: uid,
        projectId,
        name,
        ruleType: (ruleType as any) || 'PLAID_AUTO_CATEGORIZE',
        priority: priority ?? 100,
        conditions: conditions as any,
        action: action as any,
      },
    });

    // Immediately apply rule to pending transactions
    const applyResults = await RulesEngine.applyRule(rule.id);

    return NextResponse.json({ success: true, rule, applyResults });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/rules] Failed:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
