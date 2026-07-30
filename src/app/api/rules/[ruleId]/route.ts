import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { prisma } from '@/lib/prisma';
import { RulesEngine } from '@/lib/banking/rulesEngine';

/**
 * PUT /api/rules/:ruleId — Updates a rule and re-applies it.
 * DELETE /api/rules/:ruleId — Deactivates/deletes a rule.
 *
 * Auth: Firebase ID token via Authorization: Bearer header
 */
export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: { ruleId: string } }
): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { ruleId } = params;
  if (!ruleId) {
    return NextResponse.json({ success: false, error: 'ruleId is required' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const updated = await prisma.transactionRule.update({
      where: { id: ruleId },
      data: {
        name: body.name ? String(body.name) : undefined,
        conditions: body.conditions ? (body.conditions as any) : undefined,
        action: body.action ? (body.action as any) : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
        priority: body.priority !== undefined ? Number(body.priority) : undefined,
        updatedAt: new Date(),
      },
    });

    // Re-apply updated rule
    const applyResults = await RulesEngine.applyRule(ruleId);

    return NextResponse.json({ success: true, rule: updated, applyResults });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[PUT /api/rules/${ruleId}] Failed:`, msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(
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
    await prisma.transactionRule.update({
      where: { id: ruleId },
      data: { isActive: false, updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, message: 'Rule deactivated' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[DELETE /api/rules/${ruleId}] Failed:`, msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
