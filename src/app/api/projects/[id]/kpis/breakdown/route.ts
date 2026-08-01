import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/projects/:projectId/kpis/breakdown?groupBy=classification&startDate=xxx&endDate=xxx
 *
 * Returns financial breakdown by category / classification for pie charts & analytics.
 *
 * Auth: Firebase ID token via Authorization: Bearer header
 */
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { id } = params;
  const { searchParams } = new URL(req.url);
  const groupBy = searchParams.get('groupBy') || 'classification';
  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');

  try {
    const transactions = await prisma.financialTransaction.findMany({
      where: {
        id,
        status: { in: ['AUTO_APPROVED', 'MANUALLY_APPROVED'] },
        ...(startDateStr && endDateStr
          ? { transactionDate: { gte: new Date(startDateStr), lte: new Date(endDateStr) } }
          : {}),
      },
    });

    const breakdown: Record<string, number> = {};
    for (const t of transactions) {
      const key = groupBy === 'classification' ? String(t.category) : String(t.source);
      breakdown[key] = (breakdown[key] || 0) + Number(t.amount);
    }

    return NextResponse.json({
      success: true,
      id,
      groupBy,
      totalCount: transactions.length,
      breakdown,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[GET /api/projects/${id}/kpis/breakdown] Failed:`, msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
