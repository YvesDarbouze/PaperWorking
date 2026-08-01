import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/projects/[id]/transactions
 *
 * Returns Plaid-attributed Transaction rows for a project.
 *
 * Query params:
 *   ?reviewed=false   — filter to only unreviewed (pending attribution confirmation)
 *   ?limit=50         — max rows (default 100)
 *   ?cursor=<date>    — pagination cursor (ISO date string)
 *
 * Auth: Firebase ID token via Authorization: Bearer header
 * Ownership check: project must belong to the authenticated user's organization.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { uid } = auth;
  const { id: projectId } = params;

  if (!projectId) {
    return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
  }

  // Ownership check: verify the project belongs to the user's organization
  try {
    const userSnap = await adminDb.collection('users').doc(uid).get();
    const orgId = userSnap.data()?.organizationId;

    if (!orgId) {
      return NextResponse.json({ success: false, error: 'User has no organization' }, { status: 403 });
    }

    const projectSnap = await adminDb.collection('projects').doc(projectId).get();
    if (!projectSnap.exists) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const projectData = projectSnap.data();
    if (projectData?.organizationId !== orgId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
  } catch (err) {
    console.error('[GET /api/projects/[id]/transactions] Ownership check failed:', err);
    return NextResponse.json({ success: false, error: 'Authorization check failed' }, { status: 500 });
  }

  // Parse query params
  const url = new URL(req.url);
  const reviewedParam = url.searchParams.get('reviewed');
  const limitParam = parseInt(url.searchParams.get('limit') ?? '100', 10);
  const cursor = url.searchParams.get('cursor');

  const limit = Math.min(Math.max(limitParam, 1), 200); // clamp 1–200

  // Build Prisma where clause
  const where: Record<string, unknown> = { projectId };
  if (reviewedParam === 'false') {
    where.reviewedByUser = false;
  }
  if (cursor) {
    where.date = { lt: new Date(cursor) };
  }

  try {
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit,
      select: {
        id: true,
        plaidId: true,
        amount: true,
        date: true,
        merchantName: true,
        reiCategory: true,
        confidence: true,
        pending: true,
        reviewedByUser: true,
        attributedAt: true,
        category: true,
      },
    });

    // Serialize BigInt amounts to numbers (cents)
    const serialized = transactions.map((tx) => ({
      ...tx,
      amount: Number(tx.amount),
      date: tx.date.toISOString(),
      attributedAt: tx.attributedAt?.toISOString() ?? null,
    }));

    // Pagination cursor = ISO date of last row
    const nextCursor =
      transactions.length === limit
        ? transactions[transactions.length - 1].date.toISOString()
        : null;

    return NextResponse.json({ success: true, transactions: serialized, nextCursor });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[GET /api/projects/[id]/transactions] DB error:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to load transactions' },
      { status: 500 }
    );
  }
}
