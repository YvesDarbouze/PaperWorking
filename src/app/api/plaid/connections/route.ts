import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/plaid/connections
 *
 * Returns all BankConnection records (with nested BankAccounts) for the
 * authenticated user. The access_token is never returned to the client.
 *
 * ?model=v2  →  returns PlaidConnection records (new DTM unified model)
 *               instead of BankConnection records. Used by the v2 UI.
 *
 * Auth: Firebase ID token via Authorization: Bearer header
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { uid } = auth;
  const model     = new URL(req.url).searchParams.get('model');
  const projectId = new URL(req.url).searchParams.get('projectId');

  try {
    // ── v2: PlaidConnection (new DTM-compliant model) ─────────────────────────
    if (model === 'v2') {
      const connections = await prisma.plaidConnection.findMany({
        where: {
          userId: uid,
          ...(projectId ? { projectId } : {}),
          // Exclude DISCONNECTED by default unless caller explicitly requests them
          status: { not: 'DISCONNECTED' },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          itemId: true,
          projectId: true,
          connectionPurpose: true,
          status: true,
          institutionName: true,
          institutionId: true,
          institutionLogoUrl: true,
          accountId: true,
          accountName: true,
          accountMask: true,
          accountSubtype: true,
          lastSyncAt: true,
          lastSuccessfulSyncAt: true,
          syncErrorCount: true,
          lastSyncErrorMessage: true,
          consentedProducts: true,
          consentedDataScopes: true,
          consentedUseCases: true,
          consentTimestamp: true,
          consentVersion: true,
          createdAt: true,
          updatedAt: true,
          // accessToken intentionally excluded — never sent to client
        },
      });

      return NextResponse.json({ success: true, connections, model: 'v2' });
    }

    // ── v1 (default): BankConnection — unchanged ──────────────────────────────
    const connections = await prisma.bankConnection.findMany({
      where: { userId: uid },
      include: { accounts: true },
      orderBy: { createdAt: 'desc' },
    });

    // Strip the encrypted access token — never send to the client
    const safe = connections.map(({ accessToken: _redacted, ...rest }) => ({
      ...rest,
      // BigInt-safe: accounts.balance is BigInt — coerce to number for JSON
      accounts: rest.accounts.map(({ balance, limit, ...acc }) => ({
        ...acc,
        balance: balance !== null ? Number(balance) : null,
        limit: limit !== null ? Number(limit) : null,
      })),
    }));

    return NextResponse.json({ success: true, connections: safe });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[GET /api/plaid/connections] Error:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to load bank connections' },
      { status: 500 }
    );
  }
}
