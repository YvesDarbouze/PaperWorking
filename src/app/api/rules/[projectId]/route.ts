import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/rules/:projectId
 *
 * Lists all active rules for a project with match metrics.
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
    const rules = await prisma.transactionRule.findMany({
      where: { projectId, isActive: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      success: true,
      projectId,
      count: rules.length,
      rules,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[GET /api/rules/${projectId}] Failed:`, msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
