import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { getBankingProvider } from '@/lib/banking';
import { decryptToken } from '@/lib/encryption/tokenVault';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/plaid/connections/[connectionId]
 *
 * Disconnects a Plaid bank connection:
 *   1. Auth-guard + ownership check
 *   2. Decrypt access_token
 *   3. Revoke item with Plaid (best-effort — proceeds even if Plaid call fails)
 *   4. Delete from Prisma (cascades to BankAccount + Transaction rows)
 *
 * Auth: Firebase ID token via Authorization: Bearer header
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { connectionId: string } }
): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { uid } = auth;
  const { connectionId } = params;

  if (!connectionId) {
    return NextResponse.json({ success: false, error: 'connectionId is required' }, { status: 400 });
  }

  // 1. Load the connection and verify ownership
  const connection = await prisma.bankConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    return NextResponse.json({ success: false, error: 'Connection not found' }, { status: 404 });
  }

  if (connection.userId !== uid) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  // 2. Revoke Plaid item (best-effort — don't fail the disconnect if Plaid is unreachable)
  try {
    if (process.env.BANKING_PROVIDER === 'plaid') {
      const decryptedToken = decryptToken(connection.accessToken);
      const provider = getBankingProvider();
      // PlaidProvider.revokeItem is optional; only call if method exists
      if (typeof (provider as any).revokeItem === 'function') {
        await (provider as any).revokeItem(decryptedToken);
      }
    }
  } catch (err) {
    // Log but do not block the disconnect
    console.error('[DELETE /api/plaid/connections] Plaid item revocation failed (continuing):', err);
  }

  // 3. Delete from Prisma — cascades to BankAccount + Transaction via schema relations
  try {
    await prisma.bankConnection.delete({ where: { id: connectionId } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[DELETE /api/plaid/connections] Failed to delete connection:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect bank account' },
      { status: 500 }
    );
  }

  // 4. Emit PostHog telemetry (fire-and-forget)
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (posthogKey) {
    fetch('https://app.posthog.com/capture/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: posthogKey,
        event: 'plaid_connection_disconnected',
        distinct_id: uid,
        properties: { connectionId, provider: 'plaid' },
      }),
    }).catch(() => {/* ignore telemetry errors */});
  }

  return NextResponse.json({ success: true });
}
