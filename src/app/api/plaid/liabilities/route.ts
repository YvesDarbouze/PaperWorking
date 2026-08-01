import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import prisma from '@/lib/prisma';

/**
 * GET /api/plaid/liabilities
 *
 * Returns all MortgageLiability records for the authenticated user's
 * active bank connections. Converts BigInt fields to numbers for JSON serialization.
 *
 * Auth: Firebase ID token via Authorization: Bearer header.
 * Security: access_token is never returned; user identity is derived from the token.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { uid } = auth;

  try {
    // Fetch connections for user, then their liabilities
    const connections = await prisma.bankConnection.findMany({
      where: { userId: uid, status: 'active' },
      include: {
        mortgageLiabilities: {
          orderBy: { fetchedAt: 'desc' },
        },
      },
    });

    const liabilities = connections.flatMap((conn) =>
      conn.mortgageLiabilities.map((ml) => ({
        id: ml.id,
        connectionId: ml.connectionId,
        accountId: ml.accountId,
        institutionName: conn.institutionName,
        lender: ml.lender,
        balance: ml.balance !== null ? Number(ml.balance) : null,
        originalBalance: ml.originalBalance !== null ? Number(ml.originalBalance) : null,
        interestRatePct: ml.interestRatePct,
        apr: ml.apr,
        nextPaymentDueDate: ml.nextPaymentDueDate?.toISOString() ?? null,
        nextPaymentAmount: ml.nextPaymentAmount !== null ? Number(ml.nextPaymentAmount) : null,
        ytdInterestPaid: ml.ytdInterestPaid !== null ? Number(ml.ytdInterestPaid) : null,
        escrowBalance: ml.escrowBalance !== null ? Number(ml.escrowBalance) : null,
        lastPaymentAmount: ml.lastPaymentAmount !== null ? Number(ml.lastPaymentAmount) : null,
        lastPaymentDate: ml.lastPaymentDate?.toISOString() ?? null,
        fetchedAt: ml.fetchedAt.toISOString(),
      }))
    );

    return NextResponse.json({ success: true, liabilities });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[GET /api/plaid/liabilities] Error:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to load mortgage liabilities' },
      { status: 500 }
    );
  }
}
